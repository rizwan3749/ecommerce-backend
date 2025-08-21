const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    variant: {
      name: String,
      value: String,
    },
    image: String,
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentDetails: {
      transactionId: String,
      paymentIntentId: String,
      amount: Number,
      currency: {
        type: String,
        default: "USD",
      },
      paymentDate: Date,
    },
    billingAddress: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: String,
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: "United States",
      },
    },
    shippingAddress: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: String,
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
        default: "United States",
      },
    },
    shipping: {
      method: {
        type: String,
        enum: ["standard", "express", "overnight"],
        default: "standard",
      },
      cost: {
        type: Number,
        default: 0,
      },
      trackingNumber: String,
      carrier: String,
      estimatedDelivery: Date,
      actualDelivery: Date,
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
      },
      tax: {
        type: Number,
        default: 0,
      },
      shipping: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    coupon: {
      code: String,
      discount: Number,
      discountType: String,
    },
    notes: {
      customer: String,
      internal: String,
    },
    timeline: [
      {
        status: {
          type: String,
          required: true,
        },
        message: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    refund: {
      amount: Number,
      reason: String,
      processedAt: Date,
      method: String,
    },
    emailNotifications: {
      orderConfirmation: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
      shippingConfirmation: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
      deliveryConfirmation: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    // Get count of orders today
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const orderCount = await this.constructor.countDocuments({
      createdAt: { $gte: today },
    });

    this.orderNumber = `ORD${year}${month}${day}${(orderCount + 1)
      .toString()
      .padStart(4, "0")}`;
  }
  next();
});

// Add status to timeline
orderSchema.methods.addTimelineEvent = function (status, message = "") {
  this.timeline.push({
    status,
    message,
    date: new Date(),
  });
  return this;
};

// Update order status
orderSchema.methods.updateStatus = function (newStatus, message = "") {
  this.status = newStatus;
  this.addTimelineEvent(newStatus, message);
  return this;
};

// Update payment status
orderSchema.methods.updatePaymentStatus = function (newStatus) {
  this.paymentStatus = newStatus;
  this.addTimelineEvent(`payment_${newStatus}`);
  return this;
};

// Add shipping tracking
orderSchema.methods.addShippingTracking = function (
  trackingNumber,
  carrier,
  estimatedDelivery
) {
  this.shipping.trackingNumber = trackingNumber;
  this.shipping.carrier = carrier;
  this.shipping.estimatedDelivery = estimatedDelivery;
  this.addTimelineEvent("shipped", `Tracking number: ${trackingNumber}`);
  return this;
};

// Mark as delivered
orderSchema.methods.markAsDelivered = function () {
  this.status = "delivered";
  this.shipping.actualDelivery = new Date();
  this.addTimelineEvent("delivered");
  return this;
};

// Process refund
orderSchema.methods.processRefund = function (
  amount,
  reason,
  method = "original_payment"
) {
  this.refund = {
    amount,
    reason,
    processedAt: new Date(),
    method,
  };
  this.status = "refunded";
  this.paymentStatus = "refunded";
  this.addTimelineEvent(
    "refunded",
    `Refund amount: $${amount}, Reason: ${reason}`
  );
  return this;
};

// Calculate order totals
orderSchema.methods.calculateTotals = function () {
  this.pricing.subtotal = this.items.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  // Apply discount
  let discount = 0;
  if (this.coupon && this.coupon.discount) {
    if (this.coupon.discountType === "percentage") {
      discount = (this.pricing.subtotal * this.coupon.discount) / 100;
    } else {
      discount = this.coupon.discount;
    }
  }

  this.pricing.discount = discount;
  this.pricing.shipping = this.shipping.cost;

  // Calculate tax
  this.pricing.tax = (this.pricing.subtotal - discount) * 0.08; // 8% tax rate

  // Calculate total
  this.pricing.total =
    this.pricing.subtotal - discount + this.pricing.tax + this.pricing.shipping;

  return this;
};

// Get order summary
orderSchema.methods.getSummary = function () {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    paymentStatus: this.paymentStatus,
    total: this.pricing.total,
    itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: this.createdAt,
    estimatedDelivery: this.shipping.estimatedDelivery,
  };
};

module.exports = mongoose.model("Order", orderSchema);
