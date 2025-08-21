const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
    // lastName: {
    //   type: String,
    //   required: false,
    //   trim: true,
    //   default: "",
    // },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        street: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        state: {
          type: String,
          required: true,
        },
        zipCode: {
          type: String,
          required: true,
        },
        country: {
          type: String,
          required: true,
          default: "United States",
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    role: {
      type: String,
      enum: ["user", "seller", "admin"],
      default: "user",
    },
    // Seller specific fields
    businessName: {
      type: String,
      trim: true,
    },
    businessDescription: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },
    businessPhone: {
      type: String,
      trim: true,
    },
    sellerStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    preferences: {
      newsletter: {
        type: Boolean,
        default: true,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual("fullName").get(function () {
  return this.firstName || "";
});

// Remove password from JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

module.exports = mongoose.model("User", userSchema);
