const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const User = require("./models/User");
const Product = require("./models/Product");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function createSampleProducts() {
  try {
    console.log("Creating sample products...");

    // Check if we already have sample products
    const existingProducts = await Product.countDocuments();
    if (existingProducts > 0) {
      console.log(
        `Found ${existingProducts} existing products. Creating additional samples...`
      );
    }

    // Create a sample seller user if it doesn't exist
    let sampleSeller = await User.findOne({ email: "sample@seller.com" });

    if (!sampleSeller) {
      console.log("Creating sample seller...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      sampleSeller = new User({
        firstName: "Sample",
        email: "sample@seller.com",
        password: hashedPassword,
        role: "seller",
        businessName: "Sample Store",
        businessDescription: "A sample store for testing purposes",
        businessAddress: "123 Sample Street, Sample City",
        businessPhone: "+1234567890",
        sellerStatus: "approved",
      });
      await sampleSeller.save();
      console.log("Sample seller created:", sampleSeller.email);
    }

    const sampleProducts = [
      {
        name: "Wireless Bluetooth Headphones",
        description:
          "High-quality wireless headphones with noise cancellation and long battery life. Perfect for music lovers and professionals.",
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
          "Bluetooth 5.0, 30-hour battery life, Active noise cancellation, Foldable design",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: [
          "wireless",
          "bluetooth",
          "headphones",
          "audio",
          "noise-cancellation",
        ],
      },
      {
        name: "Organic Cotton T-Shirt",
        description:
          "Comfortable and eco-friendly t-shirt made from 100% organic cotton. Available in multiple colors and sizes.",
        price: 24.99,
        category: "Clothing",
        brand: "EcoWear",
        condition: "new",
        stock: 100,
        images: ["/uploads/products/tshirt.jpg"],
        specifications:
          "100% organic cotton, Machine washable, Multiple sizes available",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["organic", "cotton", "tshirt", "clothing", "eco-friendly"],
      },
      {
        name: "Wireless Charging Pad",
        description:
          "Fast wireless charging pad compatible with all Qi-enabled devices. Sleek design with LED indicator.",
        price: 39.99,
        originalPrice: 49.99,
        salePrice: 39.99,
        onSale: true,
        category: "Electronics",
        brand: "PowerTech",
        condition: "new",
        stock: 60,
        images: ["/uploads/products/chargingpad.jpg"],
        specifications:
          "10W fast charging, Qi-compatible, LED indicator, Non-slip base",
        seller: sampleSeller._id,
        status: "active",
        featured: false,
        tags: ["wireless", "charging", "qi", "fast-charging"],
      },
      {
        name: "Premium Yoga Mat",
        description:
          "High-quality yoga mat with excellent grip and cushioning. Perfect for yoga, pilates, and fitness activities.",
        price: 34.99,
        category: "Sports & Fitness",
        brand: "FitLife",
        condition: "new",
        stock: 40,
        images: ["/uploads/products/yogamat.jpg"],
        specifications:
          "6mm thickness, Non-slip surface, Eco-friendly materials, Includes carrying strap",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["yoga", "fitness", "mat", "exercise", "wellness"],
      },
      {
        name: "Portable Bluetooth Speaker",
        description:
          "Compact and powerful portable speaker with 360-degree sound. Water-resistant and perfect for outdoor activities.",
        price: 79.99,
        category: "Electronics",
        brand: "SoundWave",
        condition: "new",
        stock: 45,
        images: ["/uploads/products/speaker.jpg"],
        specifications:
          "20W output, 12-hour battery life, Water resistant, 360-degree sound",
        seller: sampleSeller._id,
        status: "active",
        featured: false,
        tags: ["bluetooth", "speaker", "portable", "waterproof", "audio"],
      },
      {
        name: "Ceramic Coffee Mug Set",
        description:
          "Beautiful set of 4 ceramic coffee mugs. Microwave and dishwasher safe with elegant design.",
        price: 29.99,
        category: "Home & Kitchen",
        brand: "HomeStyle",
        condition: "new",
        stock: 80,
        images: ["/uploads/products/coffeemugs.jpg"],
        specifications:
          "Set of 4, 12oz capacity each, Microwave safe, Dishwasher safe",
        seller: sampleSeller._id,
        status: "active",
        featured: false,
        tags: ["coffee", "mugs", "ceramic", "kitchen", "home"],
      },
      {
        name: "Smart Fitness Watch",
        description:
          "Advanced fitness tracking watch with heart rate monitor, GPS, and smartphone connectivity.",
        price: 199.99,
        originalPrice: 249.99,
        salePrice: 199.99,
        onSale: true,
        category: "Electronics",
        brand: "FitTech",
        condition: "new",
        stock: 30,
        images: ["/uploads/products/smartwatch.jpg"],
        specifications:
          "Heart rate monitor, GPS tracking, 7-day battery life, Water resistant",
        seller: sampleSeller._id,
        status: "active",
        featured: true,
        tags: ["smartwatch", "fitness", "tracking", "health", "gps"],
      },
      {
        name: "Stainless Steel Water Bottle",
        description:
          "Insulated stainless steel water bottle that keeps drinks cold for 24 hours or hot for 12 hours.",
        price: 19.99,
        category: "Sports & Fitness",
        brand: "HydraTech",
        condition: "new",
        stock: 120,
        images: ["/uploads/products/waterbottle.jpg"],
        specifications:
          "32oz capacity, Double-wall insulation, BPA-free, Leak-proof design",
        seller: sampleSeller._id,
        status: "active",
        featured: false,
        tags: [
          "water",
          "bottle",
          "insulated",
          "stainless-steel",
          "eco-friendly",
        ],
      },
    ];

    console.log("Creating sample products...");
    const createdProducts = await Product.insertMany(sampleProducts);

    console.log(
      `Successfully created ${createdProducts.length} sample products!`
    );
    console.log("Sample products created:");
    createdProducts.forEach((product) => {
      console.log(
        `- ${product.name} ($${product.price}) - ${
          product.featured ? "Featured" : "Regular"
        }`
      );
    });

    // Show final database status
    const totalProducts = await Product.countDocuments();
    const featuredProducts = await Product.countDocuments({ featured: true });
    const activeProducts = await Product.countDocuments({ status: "active" });

    console.log("\n=== FINAL DATABASE STATUS ===");
    console.log(`📦 Total Products: ${totalProducts}`);
    console.log(`⭐ Featured Products: ${featuredProducts}`);
    console.log(`✅ Active Products: ${activeProducts}`);
  } catch (error) {
    console.error("Error creating sample products:", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Run the script
createSampleProducts();
