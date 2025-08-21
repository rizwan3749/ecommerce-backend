const express = require("express");
const mongoose = require("mongoose");
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

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil((15 * 60) / 1000), // retry after 15 minutes
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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

// Debug middleware to log request body
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
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.error("Please make sure MongoDB is running on your system");
    console.error("You can start MongoDB with: mongod");
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
    // Test database connection
    const Product = require("./models/Product");
    const productCount = await Product.countDocuments();

    // Test if we can find a product
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
          }
        : null,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error details:", err);
  console.error("Error stack:", err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development" || !process.env.NODE_ENV
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
const server = app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Please try a different port or stop the existing server.`
      );
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
