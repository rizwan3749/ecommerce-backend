const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    variant: {
      name: String,
      value: String,
      price: Number,
    },
    price: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: String, // Changed from ObjectId to String to support temporary IDs
      required: true,
    },
    items: [cartItemSchema],
    coupon: {
      code: String,
      discount: {
        type: Number,
        default: 0,
      },
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
    },
    shippingAddress: {
      type: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home",
      },
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: "United States",
      },
    },
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "overnight"],
      default: "standard",
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals
cartSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Apply coupon discount
  let discount = 0;
  if (this.coupon && this.coupon.discount) {
    if (this.coupon.discountType === "percentage") {
      discount = (this.subtotal * this.coupon.discount) / 100;
    } else {
      discount = this.coupon.discount;
    }
  }

  // Calculate tax (simplified - you might want to integrate with a tax service)
  this.tax = (this.subtotal - discount) * 0.08; // 8% tax rate

  // Calculate total
  this.total = this.subtotal - discount + this.tax + this.shippingCost;

  return this;
};

// Add item to cart
cartSchema.methods.addItem = function (
  productId,
  quantity = 1,
  variant = null
) {
  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() &&
      (!variant || (item.variant && item.variant.value === variant.value))
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * existingItem.price;
  } else {
    this.items.push({
      product: productId,
      quantity,
      variant,
      price: variant ? variant.price : 0,
      totalPrice: quantity * (variant ? variant.price : 0),
    });
  }

  this.calculateTotals();
  return this;
};

// Remove item from cart
cartSchema.methods.removeItem = function (itemId) {
  this.items = this.items.filter(
    (item) => item._id.toString() !== itemId.toString()
  );
  this.calculateTotals();
  return this;
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.find(
    (item) => item._id.toString() === itemId.toString()
  );
  if (item) {
    item.quantity = Math.max(1, quantity);
    item.totalPrice = item.quantity * item.price;
    this.calculateTotals();
  }
  return this;
};

// Clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.coupon = null;
  this.calculateTotals();
  return this;
};

// Check if cart is empty
cartSchema.methods.isEmpty = function () {
  return this.items.length === 0;
};

// Get cart item count
cartSchema.methods.getItemCount = function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

// Apply coupon
cartSchema.methods.applyCoupon = function (couponCode, discount, discountType) {
  this.coupon = {
    code: couponCode,
    discount,
    discountType,
  };
  this.calculateTotals();
  return this;
};

// Remove coupon
cartSchema.methods.removeCoupon = function () {
  this.coupon = null;
  this.calculateTotals();
  return this;
};

// Set shipping address
cartSchema.methods.setShippingAddress = function (address) {
  this.shippingAddress = address;
  return this;
};

// Set shipping method
cartSchema.methods.setShippingMethod = function (method, cost) {
  this.shippingMethod = method;
  this.shippingCost = cost;
  this.calculateTotals();
  return this;
};

module.exports = mongoose.model("Cart", cartSchema);
