const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

// Test cart functionality without authentication
async function testCart() {
  try {
    console.log("Testing Cart Functionality...\n");

    // Generate a temporary user ID
    const tempUserId =
      "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    console.log("Using temporary user ID:", tempUserId);

    // 1. Get cart (should create new cart)
    console.log("1. Getting cart...");
    const getCartResponse = await axios.get(`${BASE_URL}/cart/${tempUserId}`);
    console.log("✅ Cart retrieved successfully");
    console.log("Cart items:", getCartResponse.data.items.length);
    console.log("Cart total:", getCartResponse.data.total);

    // 2. Get a product to add to cart
    console.log("\n2. Getting a product...");
    const productsResponse = await axios.get(`${BASE_URL}/products?limit=1`);
    const product = productsResponse.data.products[0];
    if (!product) {
      console.log("❌ No products found");
      return;
    }
    console.log("✅ Product found:", product.name);

    // 3. Add item to cart
    console.log("\n3. Adding item to cart...");
    const addToCartResponse = await axios.post(
      `${BASE_URL}/cart/${tempUserId}/add`,
      {
        productId: product._id,
        quantity: 2,
      }
    );
    console.log("✅ Item added to cart successfully");
    console.log("Cart items:", addToCartResponse.data.cart.items.length);
    console.log("Cart total:", addToCartResponse.data.cart.total);

    // 4. Get cart again to verify
    console.log("\n4. Getting cart again...");
    const getCartAgainResponse = await axios.get(
      `${BASE_URL}/cart/${tempUserId}`
    );
    console.log("✅ Cart retrieved successfully");
    console.log("Cart items:", getCartAgainResponse.data.items.length);
    console.log("Cart total:", getCartAgainResponse.data.total);

    // 5. Update item quantity
    if (getCartAgainResponse.data.items.length > 0) {
      const itemId = getCartAgainResponse.data.items[0]._id;
      console.log("\n5. Updating item quantity...");
      const updateResponse = await axios.put(
        `${BASE_URL}/cart/${tempUserId}/update/${itemId}`,
        {
          quantity: 3,
        }
      );
      console.log("✅ Item quantity updated successfully");
      console.log("New cart total:", updateResponse.data.cart.total);
    }

    // 6. Get cart count
    console.log("\n6. Getting cart count...");
    const countResponse = await axios.get(
      `${BASE_URL}/cart/${tempUserId}/count`
    );
    console.log("✅ Cart count:", countResponse.data.count);

    // 7. Clear cart
    console.log("\n7. Clearing cart...");
    const clearResponse = await axios.delete(
      `${BASE_URL}/cart/${tempUserId}/clear`
    );
    console.log("✅ Cart cleared successfully");
    console.log(
      "Cart items after clear:",
      clearResponse.data.cart.items.length
    );

    console.log("\n🎉 All cart tests passed successfully!");
    console.log("Cart system is working without authentication.");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run the test
testCart();


