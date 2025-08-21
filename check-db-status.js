const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("./models/User");
const Product = require("./models/Product");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function checkDatabaseStatus() {
  try {
    console.log("\n=== DATABASE STATUS REPORT ===\n");

    // Check total products
    const totalProducts = await Product.countDocuments();
    console.log(`📦 Total Products: ${totalProducts}`);

    // Check featured products
    const featuredProducts = await Product.countDocuments({ featured: true });
    console.log(`⭐ Featured Products: ${featuredProducts}`);

    // Check active products
    const activeProducts = await Product.countDocuments({ status: "active" });
    console.log(`✅ Active Products: ${activeProducts}`);

    // Check pending products
    const pendingProducts = await Product.countDocuments({ status: "pending" });
    console.log(`⏳ Pending Products: ${pendingProducts}`);

    // Check total sellers
    const totalSellers = await User.countDocuments({ role: "seller" });
    console.log(`👨‍💼 Total Sellers: ${totalSellers}`);

    // Check approved sellers
    const approvedSellers = await User.countDocuments({
      role: "seller",
      sellerStatus: "approved",
    });
    console.log(`✅ Approved Sellers: ${approvedSellers}`);

    // Show sample products
    console.log("\n=== SAMPLE PRODUCTS ===");
    const sampleProducts = await Product.find()
      .populate("seller", "firstName businessName")
      .limit(5)
      .select("name price status featured seller");

    if (sampleProducts.length === 0) {
      console.log("❌ No products found in database");
    } else {
      sampleProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Price: $${product.price}`);
        console.log(`   Status: ${product.status}`);
        console.log(`   Featured: ${product.featured ? "Yes" : "No"}`);
        console.log(
          `   Seller: ${
            product.seller?.businessName ||
            product.seller?.firstName ||
            "Unknown"
          }`
        );
        console.log("");
      });
    }

    // Show sample sellers
    console.log("=== SAMPLE SELLERS ===");
    const sampleSellers = await User.find({ role: "seller" })
      .limit(3)
      .select("firstName businessName sellerStatus");

    if (sampleSellers.length === 0) {
      console.log("❌ No sellers found in database");
    } else {
      sampleSellers.forEach((seller, index) => {
        console.log(`${index + 1}. ${seller.businessName || seller.firstName}`);
        console.log(`   Status: ${seller.sellerStatus || "Not set"}`);
        console.log("");
      });
    }

    console.log("=== END REPORT ===\n");
  } catch (error) {
    console.error("Error checking database status:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Run the script
checkDatabaseStatus();


