const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    images: [
      {
        url: String,
        alt: String,
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    helpful: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        helpful: {
          type: Boolean,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    moderationNotes: String,
    reported: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          enum: ["inappropriate", "spam", "fake", "other"],
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for product and user
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ status: 1 });

// Prevent multiple reviews from same user for same product
reviewSchema.pre("save", async function (next) {
  if (this.isNew) {
    const existingReview = await this.constructor.findOne({
      product: this.product,
      user: this.user,
    });

    if (existingReview) {
      return next(new Error("You have already reviewed this product"));
    }
  }
  next();
});

// Update product rating when review is saved
reviewSchema.post("save", async function () {
  try {
    if (this.status === "approved") {
      await this.updateProductRating();
    }
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
});

// Update product rating when review is updated
reviewSchema.post("findOneAndUpdate", async function () {
  try {
    if (this.status === "approved") {
      await this.updateProductRating();
    }
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
});

// Method to update product rating
reviewSchema.methods.updateProductRating = async function () {
  const Product = mongoose.model("Product");

  const stats = await this.constructor.aggregate([
    {
      $match: {
        product: this.product,
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(this.product, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].totalReviews,
    });
  }
};

// Get helpful count
reviewSchema.methods.getHelpfulCount = function () {
  return this.helpful.filter((h) => h.helpful).length;
};

// Get not helpful count
reviewSchema.methods.getNotHelpfulCount = function () {
  return this.helpful.filter((h) => !h.helpful).length;
};

// Add helpful vote
reviewSchema.methods.addHelpfulVote = function (userId, isHelpful) {
  const existingVote = this.helpful.find(
    (h) => h.user.toString() === userId.toString()
  );

  if (existingVote) {
    existingVote.helpful = isHelpful;
  } else {
    this.helpful.push({
      user: userId,
      helpful: isHelpful,
    });
  }

  return this.save();
};

// Report review
reviewSchema.methods.reportReview = function (userId, reason, comment = "") {
  const existingReport = this.reported.find(
    (r) => r.user.toString() === userId.toString()
  );

  if (!existingReport) {
    this.reported.push({
      user: userId,
      reason,
      comment,
    });
  }

  return this.save();
};

// Approve review
reviewSchema.methods.approve = function () {
  this.status = "approved";
  this.verified = true;
  return this.save();
};

// Reject review
reviewSchema.methods.reject = function (notes = "") {
  this.status = "rejected";
  this.moderationNotes = notes;
  return this.save();
};

module.exports = mongoose.model("Review", reviewSchema);
