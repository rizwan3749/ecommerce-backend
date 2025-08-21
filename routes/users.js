const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  requireAuth,
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Last name must be at least 2 characters"),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, phone, avatar } = req.body;
      const updateFields = {};

      if (firstName) updateFields.firstName = firstName;
      if (lastName) updateFields.lastName = lastName;
      if (phone) updateFields.phone = phone;
      if (avatar) updateFields.avatar = avatar;

      const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
        new: true,
        runValidators: true,
      }).select("-password");

      res.json({
        message: "Profile updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/users/addresses
// @desc    Add new address
// @access  Private
router.post(
  "/addresses",
  requireAuth,
  [
    body("type")
      .isIn(["home", "work", "other"])
      .withMessage("Valid address type is required"),
    body("street").notEmpty().withMessage("Street address is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
    body("zipCode").notEmpty().withMessage("ZIP code is required"),
    body("country")
      .optional()
      .isString()
      .withMessage("Country must be a string"),
    body("isDefault")
      .optional()
      .isBoolean()
      .withMessage("isDefault must be boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, street, city, state, zipCode, country, isDefault } =
        req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If this is the default address, unset other defaults
      if (isDefault) {
        user.addresses.forEach((address) => {
          address.isDefault = false;
        });
      }

      const newAddress = {
        type,
        street,
        city,
        state,
        zipCode,
        country: country || "United States",
        isDefault: isDefault || false,
      };

      user.addresses.push(newAddress);
      await user.save();

      res.status(201).json({
        message: "Address added successfully",
        address: newAddress,
      });
    } catch (error) {
      console.error("Add address error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/users/addresses/:id
// @desc    Update address
// @access  Private
router.put(
  "/addresses/:id",
  requireAuth,
  [
    body("type")
      .optional()
      .isIn(["home", "work", "other"])
      .withMessage("Valid address type is required"),
    body("street")
      .optional()
      .notEmpty()
      .withMessage("Street address is required"),
    body("city").optional().notEmpty().withMessage("City is required"),
    body("state").optional().notEmpty().withMessage("State is required"),
    body("zipCode").optional().notEmpty().withMessage("ZIP code is required"),
    body("country")
      .optional()
      .isString()
      .withMessage("Country must be a string"),
    body("isDefault")
      .optional()
      .isBoolean()
      .withMessage("isDefault must be boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, street, city, state, zipCode, country, isDefault } =
        req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const addressIndex = user.addresses.findIndex(
        (addr) => addr._id.toString() === req.params.id
      );

      if (addressIndex === -1) {
        return res.status(404).json({ message: "Address not found" });
      }

      // If this is the default address, unset other defaults
      if (isDefault) {
        user.addresses.forEach((address) => {
          address.isDefault = false;
        });
      }

      // Update address fields
      if (type) user.addresses[addressIndex].type = type;
      if (street) user.addresses[addressIndex].street = street;
      if (city) user.addresses[addressIndex].city = city;
      if (state) user.addresses[addressIndex].state = state;
      if (zipCode) user.addresses[addressIndex].zipCode = zipCode;
      if (country) user.addresses[addressIndex].country = country;
      if (isDefault !== undefined)
        user.addresses[addressIndex].isDefault = isDefault;

      await user.save();

      res.json({
        message: "Address updated successfully",
        address: user.addresses[addressIndex],
      });
    } catch (error) {
      console.error("Update address error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/users/addresses/:id
// @desc    Delete address
// @access  Private
router.delete("/addresses/:id", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === req.params.id
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put(
  "/preferences",
  requireAuth,
  [
    body("newsletter")
      .optional()
      .isBoolean()
      .withMessage("Newsletter must be boolean"),
    body("notifications")
      .optional()
      .isBoolean()
      .withMessage("Notifications must be boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { newsletter, notifications } = req.body;

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (newsletter !== undefined) user.preferences.newsletter = newsletter;
      if (notifications !== undefined)
        user.preferences.notifications = notifications;

      await user.save();

      res.json({
        message: "Preferences updated successfully",
        preferences: user.preferences,
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Admin routes
// @route   GET /api/users/admin/all
// @desc    Get all users (admin)
// @access  Admin
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/users/admin/:id
// @desc    Get user by ID (admin)
// @access  Admin
router.get("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/admin/:id/role
// @desc    Update user role (admin)
// @access  Admin
router.put(
  "/admin/:id/role",
  requireAuth,
  requireAdmin,
  [body("role").isIn(["user", "admin"]).withMessage("Valid role is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role } = req.body;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User role updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/users/admin/:id
// @desc    Delete user (admin)
// @access  Admin
router.delete("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
