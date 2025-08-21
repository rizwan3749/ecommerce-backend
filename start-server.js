const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const userRoutes = require("./routes/users");
const paymentRoutes = require("./routes/payments");
const reviewRoutes = require("./routes/reviews");
const sellerRoutes = require("./routes/sellers");
const categoryRoutes = require("./routes/categories");

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil((15 * 60) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing middleware - only use URL encoded form data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Debug middleware
app.use((req, res, next) => {
  if (req.method === "POST" && req.path.includes("/auth")) {
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
  }
  next();
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Add sample data if needed
    try {
      const Product = require("./models/Product");
      const User = require("./models/User");

      const productCount = await Product.countDocuments();
      console.log(`Found ${productCount} products in database`);

      if (productCount === 0) {
        console.log("No products found, creating sample data...");

        // Create sample seller
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
          console.log("Created sample seller");
        }

        // Create sample products
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

        await Product.insertMany(sampleProducts);
        console.log("Created sample products");
      }
    } catch (error) {
      console.error("Error creating sample data:", error);
    }
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.error("Please make sure MongoDB is running on your system");
    process.exit(1);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/categories", categoryRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const Product = require("./models/Product");
    const productCount = await Product.countDocuments();
    const sampleProduct = await Product.findOne().lean();

    res.json({
      status: "OK",
      message: "E-commerce API is running",
      database: "Connected",
      products: productCount,
      sampleProduct: sampleProduct
        ? {
            id: sampleProduct._id,
            name: sampleProduct.name,
            price: sampleProduct.price,
          }
        : null,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", err);
  console.error("Error stack:", err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});

