const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/payments/process-demo-payment
// @desc    Process demo payment (simulation only)
// @access  Private
router.post(
  "/process-demo-payment",
  requireAuth,
  [
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be at least $0.01"),
    body("paymentMethod")
      .isIn(["card", "paypal"])
      .withMessage("Valid payment method is required"),
    body("orderId").isMongoId().withMessage("Valid order ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, paymentMethod, orderId, cardDetails } = req.body;

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate payment success (90% success rate for demo)
      const isSuccess = Math.random() > 0.1;

      if (!isSuccess) {
        return res.status(400).json({
          message: "Demo payment failed. Please try again.",
          error: "DEMO_PAYMENT_DECLINED",
        });
      }

      // Generate demo transaction ID
      const transactionId = `demo_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Update order payment status
      const Order = require("../models/Order");
      const order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.paymentStatus = "paid";
      order.paymentDetails = {
        transactionId: transactionId,
        paymentMethod: paymentMethod,
        amount: amount,
        currency: "usd",
        paymentDate: new Date(),
        isDemoPayment: true,
      };
      order.updatePaymentStatus("paid");
      await order.save();

      res.json({
        message: "Demo payment processed successfully",
        transactionId: transactionId,
        order: order,
        isDemoPayment: true,
      });
    } catch (error) {
      console.error("Demo payment processing error:", error);
      res.status(500).json({ message: "Payment processing error" });
    }
  }
);

// @route   POST /api/payments/simulate-refund
// @desc    Simulate refund (demo only)
// @access  Private
router.post(
  "/simulate-refund",
  requireAuth,
  [
    body("transactionId").notEmpty().withMessage("Transaction ID is required"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Valid refund amount is required"),
    body("reason").optional().isString().withMessage("Reason must be a string"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { transactionId, amount, reason } = req.body;

      // Simulate refund processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate demo refund ID
      const refundId = `refund_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      res.json({
        message: "Demo refund processed successfully",
        refundId: refundId,
        originalTransactionId: transactionId,
        refundAmount: amount,
        reason: reason || "Demo refund request",
        refundDate: new Date(),
        isDemoRefund: true,
      });
    } catch (error) {
      console.error("Demo refund processing error:", error);
      res.status(500).json({ message: "Refund processing error" });
    }
  }
);

// @route   GET /api/payments/methods
// @desc    Get demo payment methods
// @access  Private
router.get("/methods", requireAuth, async (req, res) => {
  try {
    // Return demo payment methods
    const demoMethods = [
      {
        id: "demo_card_1",
        type: "card",
        brand: "visa",
        last4: "4242",
        expiryMonth: 12,
        expiryYear: 2025,
        isDemo: true,
      },
      {
        id: "demo_card_2",
        type: "card",
        brand: "mastercard",
        last4: "5555",
        expiryMonth: 10,
        expiryYear: 2026,
        isDemo: true,
      },
    ];

    res.json({
      paymentMethods: demoMethods,
      message: "These are demo payment methods",
    });
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/payments/validate-demo-card
// @desc    Validate demo card details
// @access  Private
router.post(
  "/validate-demo-card",
  requireAuth,
  [
    body("cardNumber").notEmpty().withMessage("Card number is required"),
    body("expiryDate").notEmpty().withMessage("Expiry date is required"),
    body("cvv").notEmpty().withMessage("CVV is required"),
    body("cardName").notEmpty().withMessage("Cardholder name is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { cardNumber, expiryDate, cvv, cardName } = req.body;

      // Demo card validation (always passes for demo)
      const validDemoCards = [
        "4111111111111111", // Visa
        "4242424242424242", // Visa
        "5555555555554444", // Mastercard
        "378282246310005", // Amex
      ];

      const cleanCardNumber = cardNumber.replace(/\s/g, "");
      const isValidDemo =
        validDemoCards.includes(cleanCardNumber) ||
        cleanCardNumber.startsWith("4111");

      res.json({
        isValid: true, // Always valid for demo
        cardType: cleanCardNumber.startsWith("4")
          ? "visa"
          : cleanCardNumber.startsWith("5")
          ? "mastercard"
          : cleanCardNumber.startsWith("3")
          ? "amex"
          : "unknown",
        last4: cleanCardNumber.slice(-4),
        isDemo: true,
        message: isValidDemo
          ? "Demo card validated successfully"
          : "Demo card accepted (any card works in demo mode)",
      });
    } catch (error) {
      console.error("Demo card validation error:", error);
      res.status(500).json({ message: "Card validation error" });
    }
  }
);

// @route   GET /api/payments/demo-status
// @desc    Get demo payment system status
// @access  Public
router.get("/demo-status", (req, res) => {
  res.json({
    isDemoMode: true,
    message: "Payment system is running in demo mode",
    features: {
      cardPayments: true,
      paypalPayments: true,
      refunds: true,
      webhooks: false,
      realProcessing: false,
    },
    testCards: [
      {
        number: "4111 1111 1111 1111",
        brand: "Visa",
        description: "Demo success card",
      },
      {
        number: "4242 4242 4242 4242",
        brand: "Visa",
        description: "Demo success card",
      },
      {
        number: "5555 5555 5555 4444",
        brand: "Mastercard",
        description: "Demo success card",
      },
    ],
  });
});

module.exports = router;
