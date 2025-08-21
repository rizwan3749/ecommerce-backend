const express = require("express");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/orders
// @desc    Create a new order from cart
// @access  Private
router.post(
  "/",
  requireAuth,
  [
    body("paymentMethod").notEmpty().withMessage("Payment method is required"),
    body("billingAddress")
      .isObject()
      .withMessage("Billing address is required"),
    body("shippingAddress")
      .isObject()
      .withMessage("Shipping address is required"),
    body("shippingMethod")
      .isIn(["standard", "express", "overnight"])
      .withMessage("Valid shipping method is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        paymentMethod,
        billingAddress,
        shippingAddress,
        shippingMethod,
        notes,
      } = req.body;

      // Get user's cart
      const cart = await Cart.findOne({ user: req.user._id }).populate(
        "items.product"
      );

      if (!cart || cart.isEmpty()) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Validate stock for all items
      for (const item of cart.items) {
        const product = await Product.findById(item.product._id);
        if (!product || product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }

      // Calculate shipping cost based on method
      const shippingCosts = {
        standard: 5.99,
        express: 12.99,
        overnight: 24.99,
      };

      // Create order items
      const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        variant: item.variant,
        image: item.product.images[0]?.url || "",
      }));

      // Create order
      const order = new Order({
        user: req.user._id,
        items: orderItems,
        paymentMethod,
        billingAddress,
        shippingAddress,
        shipping: {
          method: shippingMethod,
          cost: shippingCosts[shippingMethod],
        },
        pricing: {
          subtotal: cart.subtotal,
          tax: cart.tax,
          shipping: shippingCosts[shippingMethod],
          discount: cart.coupon ? cart.coupon.discount : 0,
          total: cart.total,
        },
        coupon: cart.coupon,
        notes: {
          customer: notes?.customer || "",
        },
      });

      // Calculate totals
      order.calculateTotals();
      await order.save();

      // Update product stock
      for (const item of cart.items) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity },
        });
      }

      // Clear cart
      cart.clearCart();
      await cart.save();

      // Populate order details
      await order.populate("items.product", "name images");

      res.status(201).json({
        message: "Order created successfully",
        order,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get("/", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("items.product", "name images description");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending" && order.status !== "confirmed") {
      return res.status(400).json({
        message: "Order cannot be cancelled at this stage",
      });
    }

    // Update order status
    order.updateStatus("cancelled", "Order cancelled by customer");
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/orders/:id/track
// @desc    Track order
// @access  Private
router.post("/:id/track", requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // TODO: Integrate with shipping carrier API
    // For now, return mock tracking info
    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.shipping.trackingNumber,
      carrier: order.shipping.carrier,
      estimatedDelivery: order.shipping.estimatedDelivery,
      timeline: order.timeline,
    };

    res.json(trackingInfo);
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/orders/:id/review
// @desc    Submit order review
// @access  Private
router.post(
  "/:id/review",
  requireAuth,
  [
    body("productId").isMongoId().withMessage("Valid product ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters"),
    body("comment")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, rating, title, comment } = req.body;

      // Verify order belongs to user and contains the product
      const order = await Order.findOne({
        _id: req.params.id,
        user: req.user._id,
        "items.product": productId,
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if order is delivered
      if (order.status !== "delivered") {
        return res.status(400).json({
          message: "You can only review products from delivered orders",
        });
      }

      // Create review
      const Review = require("../models/Review");
      const review = new Review({
        user: req.user._id,
        product: productId,
        order: order._id,
        rating,
        title,
        comment,
      });

      await review.save();

      res.status(201).json({
        message: "Review submitted successfully",
        review,
      });
    } catch (error) {
      console.error("Submit review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin routes
// @route   GET /api/orders/admin/all
// @desc    Get all orders (admin)
// @access  Admin
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const orders = await Order.find(filter)
      .populate("user", "firstName lastName email")
      .populate("items.product", "name sku")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/orders/admin/:id/status
// @desc    Update order status (admin)
// @access  Admin
router.put(
  "/admin/:id/status",
  requireAuth,
  requireAdmin,
  [
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ])
      .withMessage("Valid status is required"),
    body("message")
      .optional()
      .isString()
      .withMessage("Message must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, message } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.updateStatus(status, message);
      await order.save();

      res.json({
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/orders/admin/:id/shipping
// @desc    Update shipping information (admin)
// @access  Admin
router.put(
  "/admin/:id/shipping",
  requireAuth,
  requireAdmin,
  [
    body("trackingNumber")
      .notEmpty()
      .withMessage("Tracking number is required"),
    body("carrier").notEmpty().withMessage("Carrier is required"),
    body("estimatedDelivery").isISO8601().withMessage("Valid date is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { trackingNumber, carrier, estimatedDelivery } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.addShippingTracking(
        trackingNumber,
        carrier,
        new Date(estimatedDelivery)
      );
      await order.save();

      res.json({
        message: "Shipping information updated successfully",
        order,
      });
    } catch (error) {
      console.error("Update shipping error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/orders/admin/:id/refund
// @desc    Process refund (admin)
// @access  Admin
router.post(
  "/admin/:id/refund",
  requireAuth,
  requireAdmin,
  [
    body("amount").isFloat({ min: 0 }).withMessage("Valid amount is required"),
    body("reason").notEmpty().withMessage("Refund reason is required"),
    body("method")
      .optional()
      .isIn(["original_payment", "store_credit"])
      .withMessage("Valid refund method is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, reason, method = "original_payment" } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (amount > order.pricing.total) {
        return res.status(400).json({
          message: "Refund amount cannot exceed order total",
        });
      }

      order.processRefund(amount, reason, method);
      await order.save();

      res.json({
        message: "Refund processed successfully",
        order,
      });
    } catch (error) {
      console.error("Process refund error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
