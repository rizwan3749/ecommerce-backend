const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Product = require("./models/Product");
const Review = require("./models/Review");

async function testDatabase() {
  try {
    console.log("Testing database connection...");
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce");
    console.log("✅ Connected to MongoDB");
    
    // Test Product model
    console.log("\nTesting Product model...");
    const productCount = await Product.countDocuments();
    console.log(`✅ Products in database: ${productCount}`);
    
    if (productCount > 0) {
      const sampleProduct = await Product.findOne();
      console.log(`✅ Sample product: ${sampleProduct.name} (ID: ${sampleProduct._id})`);
    }
    
    // Test Review model
    console.log("\nTesting Review model...");
    const reviewCount = await Review.countDocuments();
    console.log(`✅ Reviews in database: ${reviewCount}`);
    
    // Test finding a specific product
    console.log("\nTesting specific product lookup...");
    const testProductId = "68a45024158d5d84f335d55a";
    const testProduct = await Product.findById(testProductId);
    
    if (testProduct) {
      console.log(`✅ Found product: ${testProduct.name}`);
      
      // Test reviews for this product
      const reviews = await Review.find({ product: testProductId });
      console.log(`✅ Reviews for this product: ${reviews.length}`);
    } else {
      console.log("❌ Product not found");
    }
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Database test failed:", error);
    console.error("Error stack:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

testDatabase();


