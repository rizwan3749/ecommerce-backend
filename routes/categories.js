const express = require("express");
const router = express.Router();

// Hierarchical categories data structure
const categories = [
  {
    id: 1,
    name: "Men Fashion",
    slug: "men-fashion",
    description: "Men's clothing and accessories",
    subcategories: [
      {
        id: 11,
        name: "Western Wear",
        slug: "western-wear",
        subcategories: [
          {
            id: 111,
            name: "Tops, Tshirts & Shirts",
            slug: "tops-tshirts-shirts",
            subcategories: [
              { id: 1111, name: "Shirts", slug: "shirts" },
              { id: 1112, name: "Tshirts", slug: "tshirts" },
              { id: 1113, name: "Tops", slug: "tops" },
            ],
          },
          {
            id: 112,
            name: "Bottom Wear",
            slug: "bottom-wear",
            subcategories: [
              { id: 1121, name: "Jeans", slug: "jeans" },
              { id: 1122, name: "Trousers", slug: "trousers" },
              { id: 1123, name: "Shorts", slug: "shorts" },
            ],
          },
        ],
      },
      {
        id: 12,
        name: "Ethnic Wear",
        slug: "ethnic-wear",
        subcategories: [
          { id: 121, name: "Kurtas", slug: "kurtas" },
          { id: 122, name: "Sherwanis", slug: "sherwanis" },
          { id: 123, name: "Dhotis", slug: "dhotis" },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Women Fashion",
    slug: "women-fashion",
    description: "Women's clothing and accessories",
    subcategories: [
      {
        id: 21,
        name: "Western Wear",
        slug: "western-wear",
        subcategories: [
          {
            id: 211,
            name: "Tops, Tshirts & Shirts",
            slug: "tops-tshirts-shirts",
            subcategories: [
              { id: 2111, name: "Shirts", slug: "shirts" },
              { id: 2112, name: "Tshirts", slug: "tshirts" },
              { id: 2113, name: "Tops & Tunics", slug: "tops-tunics" },
            ],
          },
          {
            id: 212,
            name: "Dresses, Gowns & Jumpsuits",
            slug: "dresses-gowns-jumpsuits",
            subcategories: [
              { id: 2121, name: "Dresses", slug: "dresses" },
              { id: 2122, name: "Gowns", slug: "gowns" },
              { id: 2123, name: "Jumpsuits", slug: "jumpsuits" },
            ],
          },
          {
            id: 213,
            name: "Jeans & Jeggings",
            slug: "jeans-jeggings",
            subcategories: [
              { id: 2131, name: "Jeans", slug: "jeans" },
              { id: 2132, name: "Jeggings", slug: "jeggings" },
            ],
          },
        ],
      },
      {
        id: 22,
        name: "Ethnic Wear",
        slug: "ethnic-wear",
        subcategories: [
          { id: 221, name: "Sarees", slug: "sarees" },
          { id: 222, name: "Salwar Kameez", slug: "salwar-kameez" },
          { id: 223, name: "Lehengas", slug: "lehengas" },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Home & Living",
    slug: "home-living",
    description: "Home decor and furniture",
    subcategories: [
      {
        id: 31,
        name: "Furniture",
        slug: "furniture",
        subcategories: [
          { id: 311, name: "Sofas", slug: "sofas" },
          { id: 312, name: "Beds", slug: "beds" },
          { id: 313, name: "Tables", slug: "tables" },
        ],
      },
      {
        id: 32,
        name: "Decor",
        slug: "decor",
        subcategories: [
          { id: 321, name: "Wall Art", slug: "wall-art" },
          { id: 322, name: "Cushions", slug: "cushions" },
          { id: 323, name: "Curtains", slug: "curtains" },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices and gadgets",
    subcategories: [
      {
        id: 41,
        name: "Mobiles & Tablets",
        slug: "mobiles-tablets",
        subcategories: [
          { id: 411, name: "Smartphones", slug: "smartphones" },
          { id: 412, name: "Tablets", slug: "tablets" },
          { id: 413, name: "Accessories", slug: "accessories" },
        ],
      },
      {
        id: 42,
        name: "Computers",
        slug: "computers",
        subcategories: [
          { id: 421, name: "Laptops", slug: "laptops" },
          { id: 422, name: "Desktops", slug: "desktops" },
          { id: 423, name: "Components", slug: "components" },
        ],
      },
    ],
  },
  {
    id: 5,
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Sports equipment and outdoor gear",
    subcategories: [
      {
        id: 51,
        name: "Fitness",
        slug: "fitness",
        subcategories: [
          { id: 511, name: "Gym Equipment", slug: "gym-equipment" },
          { id: 512, name: "Yoga", slug: "yoga" },
          { id: 513, name: "Running", slug: "running" },
        ],
      },
      {
        id: 52,
        name: "Outdoor Sports",
        slug: "outdoor-sports",
        subcategories: [
          { id: 521, name: "Cycling", slug: "cycling" },
          { id: 522, name: "Camping", slug: "camping" },
          { id: 523, name: "Hiking", slug: "hiking" },
        ],
      },
    ],
  },
];

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", (req, res) => {
  res.json(categories);
});

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get("/:id", (req, res) => {
  const categoryId = parseInt(req.params.id);
  const category = findCategoryById(categories, categoryId);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json(category);
});

// @route   GET /api/categories/flat
// @desc    Get all categories in flat structure
// @access  Public
router.get("/flat", (req, res) => {
  const flatCategories = flattenCategories(categories);
  res.json(flatCategories);
});

// Helper function to find category by ID recursively
function findCategoryById(categories, id) {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.subcategories) {
      const found = findCategoryById(category.subcategories, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to flatten categories
function flattenCategories(categories, parentPath = "") {
  let flat = [];

  for (const category of categories) {
    const currentPath = parentPath
      ? `${parentPath} / ${category.name}`
      : category.name;

    flat.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      path: currentPath,
      level: parentPath.split("/").length,
    });

    if (category.subcategories) {
      flat = flat.concat(
        flattenCategories(category.subcategories, currentPath)
      );
    }
  }

  return flat;
}

module.exports = router;
