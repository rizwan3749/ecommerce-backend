const express = require("express");
const { body, validationResult } = require("express-validator");
const Review = require("../models/Review");
const Product = require("../models/Product");
const {
  requireAuth,
  requireAdmin,
  optionalAuth,
} = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
// @access  Public
router.get("/product/:productId", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sort = "createdAt" } = req.query;
    const skip = (page - 1) * limit;

    const filter = { product: productId, status: "approved" };
    if (rating) filter.rating = parseInt(rating);

    const sortOptions = {};
    sortOptions[sort] = -1;

    const reviews = await Review.find(filter)
      .populate("user", "firstName lastName avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    // Get rating statistics
    const stats = await Review.aggregate([
      { $match: { product: productId, status: "approved" } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0) {
      stats[0].ratingDistribution.forEach((rating) => {
        ratingDistribution[rating]++;
      });
    }

    res.json({
      reviews,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats: stats[0] || { averageRating: 0, totalReviews: 0 },
      ratingDistribution,
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post(
  "/",
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

      const { productId, rating, title, comment, images } = req.body;

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if user has already reviewed this product
      const existingReview = await Review.findOne({
        product: productId,
        user: req.user._id,
      });

      if (existingReview) {
        return res.status(400).json({
          message: "You have already reviewed this product",
        });
      }

      // Create review
      const review = new Review({
        user: req.user._id,
        product: productId,
        rating,
        title,
        comment,
        images: images || [],
      });

      await review.save();

      // Populate user info
      await review.populate("user", "firstName lastName avatar");

      res.status(201).json({
        message: "Review submitted successfully",
        review,
      });
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private
router.put(
  "/:id",
  requireAuth,
  [
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters"),
    body("comment")
      .optional()
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

      const review = await Review.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Only allow updates if review is pending
      if (review.status !== "pending") {
        return res.status(400).json({
          message: "Cannot update approved or rejected review",
        });
      }

      const { rating, title, comment, images } = req.body;

      if (rating) review.rating = rating;
      if (title) review.title = title;
      if (comment) review.comment = comment;
      if (images) review.images = images;

      await review.save();
      await review.populate("user", "firstName lastName avatar");

      res.json({
        message: "Review updated successfully",
        review,
      });
    } catch (error) {
      console.error("Update review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await review.deleteOne();

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/reviews/:id/helpful
// @desc    Mark review as helpful
// @access  Private
router.post(
  "/:id/helpful",
  requireAuth,
  [body("helpful").isBoolean().withMessage("Helpful must be boolean")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { helpful } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      await review.addHelpfulVote(req.user._id, helpful);

      res.json({
        message: "Vote recorded successfully",
        helpfulCount: review.getHelpfulCount(),
        notHelpfulCount: review.getNotHelpfulCount(),
      });
    } catch (error) {
      console.error("Vote review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/reviews/:id/report
// @desc    Report review
// @access  Private
router.post(
  "/:id/report",
  requireAuth,
  [
    body("reason")
      .isIn(["inappropriate", "spam", "fake", "other"])
      .withMessage("Valid reason is required"),
    body("comment")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Comment must be less than 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reason, comment } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      await review.reportReview(req.user._id, reason, comment);

      res.json({ message: "Review reported successfully" });
    } catch (error) {
      console.error("Report review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get("/user", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const reviews = await Review.find(filter)
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin routes
// @route   GET /api/reviews/admin/pending
// @desc    Get pending reviews (admin)
// @access  Admin
router.get("/admin/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ status: "pending" })
      .populate("user", "firstName lastName email")
      .populate("product", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ status: "pending" });

    res.json({
      reviews,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get pending reviews error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/reviews/admin/:id/approve
// @desc    Approve review (admin)
// @access  Admin
router.put(
  "/admin/:id/approve",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      await review.approve();

      res.json({
        message: "Review approved successfully",
        review,
      });
    } catch (error) {
      console.error("Approve review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/reviews/admin/:id/reject
// @desc    Reject review (admin)
// @access  Admin
router.put(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  [
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be less than 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { notes } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      await review.reject(notes);

      res.json({
        message: "Review rejected successfully",
        review,
      });
    } catch (error) {
      console.error("Reject review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/reviews/admin/:id
// @desc    Delete review (admin)
// @access  Admin
router.delete("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
