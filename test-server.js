const mongoose = require("mongoose");
require("dotenv").config();

async function testServer() {
  try {
    console.log("Testing server startup...");

    // Test database connection
    console.log("Connecting to database...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce"
    );
    console.log("Database connected successfully!");

    // Test basic server setup
    const express = require("express");
    const app = express();

    // Test middleware
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    console.log("Middleware setup successful!");

    // Test routes
    const authRoutes = require("./routes/auth");
    const productRoutes = require("./routes/products");
    const categoryRoutes = require("./routes/categories");

    app.use("/api/auth", authRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/categories", categoryRoutes);
    console.log("Routes setup successful!");

    console.log("Server test completed successfully!");
    console.log("You can now start the server with: node server.js");

    process.exit(0);
  } catch (error) {
    console.error("Server test failed:", error);
    process.exit(1);
  }
}

testServer();
