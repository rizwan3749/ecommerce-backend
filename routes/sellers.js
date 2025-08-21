const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/products/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// @route   POST /api/sellers/login
// @desc    Login as a seller
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is a seller
    if (user.role !== "seller") {
      return res
        .status(400)
        .json({ message: "This account is not registered as a seller" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            _id: user._id,
            firstName: user.firstName,
            email: user.email,
            role: user.role,
            businessName: user.businessName,
            sellerStatus: user.sellerStatus,
          },
        });
      }
    );
  } catch (error) {
    console.error("Seller login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/sellers/register
// @desc    Register as a seller (direct registration)
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      email,
      password,
      phone,
      businessName,
      businessDescription,
      businessAddress,
      businessPhone,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new seller user
    const user = new User({
      firstName,
      email,
      password: hashedPassword,
      phone: phone || "",
      role: "seller",
      businessName,
      businessDescription,
      businessAddress,
      businessPhone,
      sellerStatus: "pending",
    });

    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          message: "Successfully registered as seller",
          token,
          user: {
            _id: user._id,
            firstName: user.firstName,
            email: user.email,
            role: user.role,
            businessName: user.businessName,
            sellerStatus: user.sellerStatus,
          },
        });
      }
    );
  } catch (error) {
    console.error("Seller registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/sellers/dashboard
// @desc    Get seller dashboard data
// @access  Private (Seller only)
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Access denied. Seller only." });
    }

    // Get seller's products
    const Product = require("../models/Product");
    const products = await Product.find({ seller: req.user._id });

    // Calculate stats
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter((p) => p.status === "active").length,
      pendingProducts: products.filter((p) => p.status === "pending").length,
      totalSales: 0, // You can calculate this from orders
    };

    // Get recent products
    const recentProducts = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats,
      recentProducts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/sellers/products
// @desc    Get seller's products
// @access  Private (Seller only)
router.get("/products", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Access denied. Seller only." });
    }

    const Product = require("../models/Product");
    const products = await Product.find({ seller: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    console.error("Get seller products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/sellers/products
// @desc    Add a new product
// @access  Private (Seller only)
router.post(
  "/products",
  requireAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (req.user.role !== "seller") {
        return res.status(403).json({ message: "Access denied. Seller only." });
      }

      const {
        name,
        description,
        price,
        category,
        stock,
        specifications,
        brand,
        condition,
      } = req.body;

      // Validate required fields
      if (!name || !description || !price || !category || !stock) {
        return res
          .status(400)
          .json({ message: "Please provide all required fields" });
      }

      const Product = require("../models/Product");

      // Create new product
      const product = new Product({
        name,
        description,
        price: parseFloat(price),
        category,
        stock: parseInt(stock),
        specifications: specifications || "",
        brand: brand || "",
        condition: condition || "new",
        seller: req.user._id,
        images: req.files
          ? req.files.map((file) => `/uploads/products/${file.filename}`)
          : [],
        status: "pending", // Products start as pending for review
      });

      await product.save();

      res.status(201).json({
        message: "Product added successfully",
        product,
      });
    } catch (error) {
      console.error("Add product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/sellers/products/:id
// @desc    Update a product
// @access  Private (Seller only)
router.put(
  "/products/:id",
  requireAuth,
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (req.user.role !== "seller") {
        return res.status(403).json({ message: "Access denied. Seller only." });
      }

      const Product = require("../models/Product");
      const product = await Product.findOne({
        _id: req.params.id,
        seller: req.user._id,
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const {
        name,
        description,
        price,
        category,
        stock,
        specifications,
        brand,
        condition,
      } = req.body;

      // Update product fields
      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = parseFloat(price);
      if (category) product.category = category;
      if (stock) product.stock = parseInt(stock);
      if (specifications !== undefined) product.specifications = specifications;
      if (brand !== undefined) product.brand = brand;
      if (condition) product.condition = condition;

      // Handle new images if uploaded
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(
          (file) => `/uploads/products/${file.filename}`
        );
        product.images = [...product.images, ...newImages];
      }

      await product.save();

      res.json({
        message: "Product updated successfully",
        product,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/sellers/products/:id
// @desc    Delete a product
// @access  Private (Seller only)
router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Access denied. Seller only." });
    }

    const Product = require("../models/Product");
    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
