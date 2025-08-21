const express = require("express");
const { body, validationResult } = require("express-validator");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");

const router = express.Router();

// Helper function to validate user ID
const validateUserId = (userId) => {
  // Check if it's a MongoDB ObjectId
  if (userId.match(/^[0-9a-fA-F]{24}$/)) {
    return { isValid: true, isObjectId: true };
  }

  // Check if it's a temporary user ID
  if (userId.startsWith("temp_")) {
    return { isValid: true, isObjectId: false };
  }

  return { isValid: false, isObjectId: false };
};

// @route   GET /api/cart/:userId
// @desc    Get user's cart by user ID
// @access  Public
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID format
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Check if user exists (only for ObjectIds)
    if (validation.isObjectId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    let cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price images stock sku"
    );

    if (!cart) {
      cart = new Cart({ user: userId });
      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/cart/:userId/add
// @desc    Add item to cart by user ID
// @access  Public
router.post(
  "/:userId/add",
  [
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("variant")
      .optional()
      .isObject()
      .withMessage("Variant must be an object"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { productId, quantity, variant } = req.body;

      // Validate user ID format
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists (only for ObjectIds)
      if (validation.isObjectId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      // Check if product exists and is in stock
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!product.isActive) {
        return res.status(400).json({ message: "Product is not available" });
      }

      // Check stock
      if (product.stock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      // Get or create cart
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId });
      }

      // Determine price
      let price = product.price;
      if (variant && variant.price) {
        price = variant.price;
      }

      // Add item to cart
      cart.addItem(productId, quantity, variant);
      await cart.save();

      // Populate product details
      await cart.populate("items.product", "name price images stock sku");

      res.json({
        message: "Item added to cart successfully",
        cart,
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/cart/:userId/update/:itemId
// @desc    Update cart item quantity by user ID
// @access  Public
router.put(
  "/:userId/update/:itemId",
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId, itemId } = req.params;
      const { quantity } = req.body;

      // Validate user ID format
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists (only for ObjectIds)
      if (validation.isObjectId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Find the item
      const item = cart.items.find((item) => item._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      // Check stock
      const product = await Product.findById(item.product);
      if (product.stock < quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      // Update quantity
      cart.updateItemQuantity(itemId, quantity);
      await cart.save();

      await cart.populate("items.product", "name price images stock sku");

      res.json({
        message: "Cart updated successfully",
        cart,
      });
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/cart/:userId/remove/:itemId
// @desc    Remove item from cart by user ID
// @access  Public
router.delete("/:userId/remove/:itemId", async (req, res) => {
  try {
    const { userId, itemId } = req.params;

    // Validate user ID format
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Check if user exists (only for ObjectIds)
    if (validation.isObjectId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.removeItem(itemId);
    await cart.save();

    await cart.populate("items.product", "name price images stock sku");

    res.json({
      message: "Item removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/cart/:userId/clear
// @desc    Clear cart by user ID
// @access  Public
router.delete("/:userId/clear", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID format
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Check if user exists (only for ObjectIds)
    if (validation.isObjectId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.clearCart();
    await cart.save();

    res.json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/cart/:userId/apply-coupon
// @desc    Apply coupon to cart by user ID
// @access  Public
router.post(
  "/:userId/apply-coupon",
  [body("code").notEmpty().withMessage("Coupon code is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { code } = req.body;

      // Validate user ID format
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists (only for ObjectIds)
      if (validation.isObjectId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // TODO: Validate coupon code against database
      // For now, using a simple example
      if (code === "SAVE10") {
        cart.applyCoupon(code, 10, "percentage");
        await cart.save();

        await cart.populate("items.product", "name price images stock sku");

        res.json({
          message: "Coupon applied successfully",
          cart,
        });
      } else {
        res.status(400).json({ message: "Invalid coupon code" });
      }
    } catch (error) {
      console.error("Apply coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/cart/:userId/remove-coupon
// @desc    Remove coupon from cart by user ID
// @access  Public
router.delete("/:userId/remove-coupon", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID format
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Check if user exists (only for ObjectIds)
    if (validation.isObjectId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.removeCoupon();
    await cart.save();

    await cart.populate("items.product", "name price images stock sku");

    res.json({
      message: "Coupon removed successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove coupon error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/cart/:userId/shipping-address
// @desc    Set shipping address by user ID
// @access  Public
router.put(
  "/:userId/shipping-address",
  [
    body("street").notEmpty().withMessage("Street address is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
    body("zipCode").notEmpty().withMessage("ZIP code is required"),
    body("country")
      .optional()
      .isString()
      .withMessage("Country must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { type, street, city, state, zipCode, country } = req.body;

      // Validate user ID format
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists (only for ObjectIds)
      if (validation.isObjectId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.setShippingAddress({
        type: type || "home",
        street,
        city,
        state,
        zipCode,
        country: country || "United States",
      });

      await cart.save();
      await cart.populate("items.product", "name price images stock sku");

      res.json({
        message: "Shipping address updated successfully",
        cart,
      });
    } catch (error) {
      console.error("Update shipping address error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/cart/:userId/shipping-method
// @desc    Set shipping method by user ID
// @access  Public
router.put(
  "/:userId/shipping-method",
  [
    body("method")
      .isIn(["standard", "express", "overnight"])
      .withMessage("Valid shipping method is required"),
    body("cost")
      .isFloat({ min: 0 })
      .withMessage("Shipping cost must be a positive number"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { method, cost } = req.body;

      // Validate user ID format
      const validation = validateUserId(userId);
      if (!validation.isValid) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      // Check if user exists (only for ObjectIds)
      if (validation.isObjectId) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.setShippingMethod(method, cost);
      await cart.save();

      await cart.populate("items.product", "name price images stock sku");

      res.json({
        message: "Shipping method updated successfully",
        cart,
      });
    } catch (error) {
      console.error("Update shipping method error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/cart/:userId/count
// @desc    Get cart item count by user ID
// @access  Public
router.get("/:userId/count", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID format
    const validation = validateUserId(userId);
    if (!validation.isValid) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Check if user exists (only for ObjectIds)
    if (validation.isObjectId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const cart = await Cart.findOne({ user: userId });
    const count = cart ? cart.getItemCount() : 0;

    res.json({ count });
  } catch (error) {
    console.error("Get cart count error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
