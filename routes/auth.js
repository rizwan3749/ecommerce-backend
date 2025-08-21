const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  const jwtSecret =
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production";
  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: "7d",
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Name must be at least 1 character"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phone")
      .optional()
      .isLength({ min: 5, max: 20 })
      .withMessage("Phone number must be between 5 and 20 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, name, email, password, phone } = req.body;

      // Validate firstName if provided
      if (
        firstName !== undefined &&
        firstName !== null &&
        firstName.trim().length < 1
      ) {
        return res.status(400).json({
          message: "First name must be at least 1 character if provided",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Handle name format - support both 'name' and 'firstName'
      let userFirstName = firstName || "";

      if (name && !firstName) {
        // Use the full name as firstName
        userFirstName = name.trim();
      }

      // Ensure at least firstName is provided
      if (!userFirstName.trim()) {
        return res.status(400).json({
          message: "First name is required",
        });
      }

      // Clean up the firstName
      userFirstName = userFirstName.trim();

      // Create new user
      const userData = {
        firstName: userFirstName,
        email,
        password,
        phone: phone || "",
      };

      const user = new User(userData);

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        message: "User registered successfully",
        user: user.toJSON(),
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      console.log("Login request body:", req.body);
      console.log("Login request headers:", req.headers);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const responseData = {
        message: "Login successful",
        user: user.toJSON(),
        token,
      };
      console.log("Login response:", responseData);
      res.json(responseData);
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.userId).select(
      "-password"
    );
    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/auth/profile
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

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  requireAuth,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate reset token
      const resetToken = require("crypto").randomBytes(32).toString("hex");
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // TODO: Send email with reset link
      // For now, just return the token (in production, send via email)
      res.json({
        message: "Password reset email sent",
        resetToken:
          process.env.NODE_ENV === "development" ? resetToken : undefined,
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, newPassword } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
