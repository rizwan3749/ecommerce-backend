const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const jwtSecret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production";
    const decoded = jwt.verify(token, jwtSecret);

    // Handle different token structures
    let userId;
    if (decoded.userId) {
      // Auth routes token structure: { userId }
      userId = decoded.userId;
    } else if (decoded.user && decoded.user.id) {
      // Seller routes token structure: { user: { id, role } }
      userId = decoded.user.id;
    } else {
      return res.status(401).json({ message: "Invalid token structure." });
    }

    req.user = { ...decoded, userId }; // Keep original decoded data but add userId
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

// Get user from token
const getUser = async (req, res, next) => {
  try {
    const token =
      req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

    if (token) {
      const jwtSecret =
        process.env.JWT_SECRET ||
        "your-super-secret-jwt-key-change-this-in-production";
      const decoded = jwt.verify(token, jwtSecret);

      // Handle different token structures
      let userId;
      if (decoded.userId) {
        // Auth routes token structure: { userId }
        userId = decoded.userId;
      } else if (decoded.user && decoded.user.id) {
        // Seller routes token structure: { user: { id, role } }
        userId = decoded.user.id;
      } else {
        // Invalid token structure, continue without user
        return next();
      }

      const user = await User.findById(userId).select("-password");
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

// Require authentication
const requireAuth = async (req, res, next) => {
  try {
    const token =
      req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Access denied. Please log in." });
    }

    const jwtSecret =
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production";
    const decoded = jwt.verify(token, jwtSecret);

    // Handle different token structures
    let userId;
    if (decoded.userId) {
      // Auth routes token structure: { userId }
      userId = decoded.userId;
    } else if (decoded.user && decoded.user.id) {
      // Seller routes token structure: { user: { id, role } }
      userId = decoded.user.id;
    } else {
      return res.status(401).json({ message: "Invalid token structure." });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Don't log malformed token errors to reduce noise
    if (error.name !== "JsonWebTokenError") {
      console.error("Auth middleware error details:", error.message);
    }
    res.status(401).json({ message: "Invalid token." });
  }
};

// Require seller role
const requireSeller = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Access denied. Please log in." });
    }

    if (req.user.role !== "seller" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Seller role required." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

// Require admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Access denied. Please log in." });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin role required." });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

// Optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;

    if (token) {
      const jwtSecret =
        process.env.JWT_SECRET ||
        "your-super-secret-jwt-key-change-this-in-production";
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.userId).select("-password");
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  verifyToken,
  getUser,
  requireAuth,
  requireSeller,
  requireAdmin,
  optionalAuth,
};
