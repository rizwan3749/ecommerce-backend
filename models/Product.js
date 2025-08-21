const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "new",
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    specifications: {
      type: String,
      maxlength: 1000,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "rejected"],
      default: "pending",
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },
    shippingInfo: {
      freeShipping: { type: Boolean, default: false },
      shippingCost: { type: Number, min: 0, default: 0 },
      estimatedDays: { type: Number, min: 1, default: 7 },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (this.onSale && this.originalPrice && this.salePrice) {
    return Math.round(
      ((this.originalPrice - this.salePrice) / this.originalPrice) * 100
    );
  }
  return 0;
});

// Virtual for current price
productSchema.virtual("currentPrice").get(function () {
  return this.onSale && this.salePrice ? this.salePrice : this.price;
});

// Method to update average rating
productSchema.methods.updateAverageRating = async function () {
  const Review = mongoose.model("Review");
  const reviews = await Review.find({ product: this._id });

  if (reviews.length === 0) {
    this.averageRating = 0;
    this.reviewCount = 0;
  } else {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = totalRating / reviews.length;
    this.reviewCount = reviews.length;
  }

  await this.save();
};

// Pre-save middleware to generate SKU if not provided
productSchema.pre("save", async function (next) {
  try {
    if (!this.sku) {
      const Product = mongoose.model("Product");
      const count = await Product.countDocuments();
      this.sku = `SKU${String(count + 1).padStart(6, "0")}`;
    }
    next();
  } catch (error) {
    console.error("Error in pre-save middleware:", error);
    next(error);
  }
});

// Static method to get products with filters
productSchema.statics.getProductsWithFilters = async function (filters = {}) {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sortBy = "newest",
    page = 1,
    limit = 12,
    status = "active",
  } = filters;

  const query = { status };

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Search filter
  if (search) {
    query.$text = { $search: search };
  }

  // Sort options
  let sort = {};
  switch (sortBy) {
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "oldest":
      sort = { createdAt: 1 };
      break;
    case "price-low":
      sort = { price: 1 };
      break;
    case "price-high":
      sort = { price: -1 };
      break;
    case "rating":
      sort = { averageRating: -1 };
      break;
    case "name":
      sort = { name: 1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    this.find(query)
      .populate("seller", "firstName businessName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    this.countDocuments(query),
  ]);

  return {
    products,
    totalProducts: total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};

module.exports = mongoose.model("Product", productSchema);
