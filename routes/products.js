const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// @route   GET /api/products/test
// @desc    Test endpoint to check database connection
// @access  Public
router.get("/test", async (req, res) => {
  try {
    console.log("Testing database connection...");

    // Test basic database connection
    const totalProducts = await Product.countDocuments();
    console.log("Total products in database:", totalProducts);

    // Test finding products
    const products = await Product.find().limit(1).lean();
    console.log(
      "Sample product:",
      products[0] ? products[0].name : "No products found"
    );

    // Test finding a specific product
    const testProductId = "68a45024158d5d84f335d55a";
    const testProduct = await Product.findById(testProductId).lean();
    console.log("Test product found:", testProduct ? "Yes" : "No");

    // Test if we can convert to JSON
    let jsonTest = "success";
    try {
      JSON.stringify(testProduct);
    } catch (jsonError) {
      jsonTest = "failed";
      console.error("JSON conversion error:", jsonError);
    }

    res.json({
      message: "Database connection successful",
      totalProducts,
      sampleProduct: products[0] ? products[0].name : null,
      testProductFound: !!testProduct,
      testProductId: testProductId,
      jsonTest: jsonTest,
      sampleProductData: products[0]
        ? {
            id: products[0]._id,
            name: products[0].name,
            price: products[0].price,
            category: products[0].category,
          }
        : null,
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// @route   GET /api/products
// @desc    Get all products with filters
// @access  Public
router.get("/", async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      search: req.query.search,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sortBy: req.query.sortBy,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await Product.getProductsWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    console.log("Fetching featured products...");

    // First, let's check if the Product model is working
    const totalProducts = await Product.countDocuments();
    console.log("Total products in database:", totalProducts);

    const featuredProducts = await Product.find({
      featured: true,
      status: "active",
    });
    console.log("Featured products found:", featuredProducts.length);

    const products = await Product.find({
      featured: true,
      status: "active",
    })
      .populate("seller", "firstName businessName")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    console.log("Products with seller populated:", products.length);
    res.json(products);
  } catch (error) {
    console.error("Get featured products error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// @route   GET /api/products/trending
// @desc    Get trending products (most viewed)
// @access  Public
router.get("/trending", async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({ status: "active" })
      .populate("seller", "firstName businessName")
      .sort({ views: -1, averageRating: -1 })
      .limit(parseInt(limit));

    res.json(products);
  } catch (error) {
    console.error("Get trending products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/on-sale
// @desc    Get products on sale
// @access  Public
router.get("/on-sale", async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({
      onSale: true,
      status: "active",
    })
      .populate("seller", "firstName businessName")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(products);
  } catch (error) {
    console.error("Get on-sale products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get("/category/:category", async (req, res) => {
  try {
    const { page = 1, limit = 12, sortBy = "newest" } = req.query;
    const category = req.params.category;

    const filters = {
      category,
      page,
      limit,
      sortBy,
    };

    const result = await Product.getProductsWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/search/:query
// @desc    Search products
// @access  Public
router.get("/search/:query", async (req, res) => {
  try {
    const { page = 1, limit = 12, sortBy = "newest" } = req.query;
    const searchQuery = req.params.query;

    const filters = {
      search: searchQuery,
      page,
      limit,
      sortBy,
    };

    const result = await Product.getProductsWithFilters(filters);
    res.json(result);
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/products/sample
// @desc    Create sample products for testing
// @access  Public (for development only)
router.post("/sample", async (req, res) => {
  try {
    // Check if we already have sample products
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      return res.json({ message: "Sample products already exist" });
    }

    // Create a sample seller user if it doesn't exist
    const User = require("../models/User");
    let sampleSeller = await User.findOne({ email: "sample@seller.com" });

    if (!sampleSeller) {
      sampleSeller = new User({
        firstName: "Sample",
        email: "sample@seller.com",
        password: "password123",
        role: "seller",
        businessName: "Sample Store",
        businessDescription: "A sample store for testing",
        sellerStatus: "approved",
      });
      await sampleSeller.save();
    }

    const sampleProducts = [
      {
        name: "Wireless Bluetooth Headphones",
        description:
          "High-quality wireless headphones with noise cancellation and long battery life.",
        price: 99.99,
        originalPrice: 129.99,
        salePrice: 99.99,
        onSale: true,
        category: "Electronics",
        brand: "TechAudio",
        condition: "new",
        stock: 50,
        images: ["/uploads/products/headphones.jpg"],
        specifications:
          "Bluetooth 5.0, 30-hour battery life, Active noise cancellation",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["wireless", "bluetooth", "headphones", "audio"],
      },
      {
        name: "Organic Cotton T-Shirt",
        description:
          "Comfortable and eco-friendly cotton t-shirt made from 100% organic materials.",
        price: 29.99,
        category: "Men Fashion",
        brand: "EcoWear",
        condition: "new",
        stock: 100,
        images: ["/uploads/products/tshirt.jpg"],
        specifications:
          "100% organic cotton, Machine washable, Multiple sizes available",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["organic", "cotton", "t-shirt", "fashion"],
      },
      {
        name: "Smart Fitness Watch",
        description:
          "Advanced fitness tracking watch with heart rate monitor and GPS.",
        price: 199.99,
        originalPrice: 249.99,
        salePrice: 199.99,
        onSale: true,
        category: "Electronics",
        brand: "FitTech",
        condition: "new",
        stock: 25,
        images: ["/uploads/products/watch.jpg"],
        specifications:
          "Heart rate monitor, GPS, Water resistant, 7-day battery life",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["fitness", "watch", "smart", "health"],
      },
      {
        name: "Handcrafted Wooden Coffee Table",
        description:
          "Beautiful handcrafted wooden coffee table perfect for any living room.",
        price: 299.99,
        category: "Home & Living",
        brand: "WoodCraft",
        condition: "new",
        stock: 10,
        images: ["/uploads/products/table.jpg"],
        specifications: "Solid oak wood, Handcrafted, Assembly required",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["wooden", "furniture", "coffee table", "handcrafted"],
      },
    ];

    const createdProducts = await Product.insertMany(sampleProducts);

    res.status(201).json({
      message: "Sample products created successfully",
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    console.error("Create sample products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    console.log("Fetching product with ID:", req.params.id);

    // Basic validation
    if (!req.params.id || req.params.id.length !== 24) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Simple product lookup
    const product = await Product.findById(req.params.id).lean();

    console.log("Product found:", product ? "Yes" : "No");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Try to populate seller separately
    try {
      if (product.seller) {
        const User = require("../models/User");
        const seller = await User.findById(product.seller)
          .select("firstName businessName businessDescription")
          .lean();
        if (seller) {
          product.seller = seller;
        }
      }
    } catch (populateError) {
      console.error("Error populating seller:", populateError);
    }

    // Fetch reviews for this product
    let reviews = [];
    try {
      const Review = require("../models/Review");
      reviews = await Review.find({
        product: req.params.id,
        status: "approved",
      })
        .populate("user", "firstName")
        .sort({ createdAt: -1 })
        .lean();
    } catch (reviewError) {
      console.error("Error fetching reviews:", reviewError);
    }

    // Increment view count (handle errors gracefully)
    try {
      await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    } catch (saveError) {
      console.error("Error saving product view count:", saveError);
    }

    // Add reviews to the product object
    product.reviews = reviews;

    console.log("Sending response...");
    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    console.error("Error stack:", error.stack);

    // Check if it's a MongoDB ObjectId error
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Check if it's a validation error
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", details: error.message });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/products/:id/wishlist
// @desc    Toggle wishlist for a product
// @access  Private
router.post("/:id/wishlist", async (req, res) => {
  try {
    // For now, just return success since we don't have a wishlist model yet
    // TODO: Implement proper wishlist functionality
    res.json({ message: "Wishlist functionality coming soon" });
  } catch (error) {
    console.error("Wishlist error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/debug/:id
// @desc    Debug endpoint to test specific product
// @access  Public
router.get("/debug/:id", async (req, res) => {
  try {
    console.log("Debug: Fetching product with ID:", req.params.id);

    // Test if the ID is valid
    if (!req.params.id || req.params.id.length !== 24) {
      return res.json({
        error: "Invalid ID format",
        id: req.params.id,
        length: req.params.id ? req.params.id.length : 0,
      });
    }

    // Try to find the product
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.json({
        error: "Product not found",
        id: req.params.id,
      });
    }

    // Test JSON serialization
    let jsonError = null;
    try {
      JSON.stringify(product);
    } catch (e) {
      jsonError = e.message;
    }

    res.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        category: product.category,
        images: product.images,
        seller: product.seller,
      },
      jsonError: jsonError,
      fullProduct: jsonError ? null : product,
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.json({
      error: error.message,
      stack: error.stack,
      id: req.params.id,
    });
  }
});

module.exports = router;
