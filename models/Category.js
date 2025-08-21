const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    image: {
      url: String,
      alt: String,
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    attributes: [
      {
        name: String,
        type: {
          type: String,
          enum: ["text", "number", "boolean", "select"],
          default: "text",
        },
        options: [String],
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for slug
categorySchema.index({ slug: 1 });

// Virtual for full path
categorySchema.virtual("fullPath").get(function () {
  if (this.parent) {
    return `${this.parent.fullPath} > ${this.name}`;
  }
  return this.name;
});

// Get all children
categorySchema.methods.getChildren = function () {
  return this.model("Category").find({ parent: this._id });
};

// Get all descendants
categorySchema.methods.getDescendants = async function () {
  const descendants = [];
  const children = await this.getChildren();

  for (const child of children) {
    descendants.push(child);
    const childDescendants = await child.getDescendants();
    descendants.push(...childDescendants);
  }

  return descendants;
};

// Get ancestors
categorySchema.methods.getAncestors = async function () {
  const ancestors = [];
  let current = this;

  while (current.parent) {
    current = await this.model("Category").findById(current.parent);
    if (current) {
      ancestors.unshift(current);
    }
  }

  return ancestors;
};

// Get breadcrumb
categorySchema.methods.getBreadcrumb = async function () {
  const ancestors = await this.getAncestors();
  return [...ancestors, this];
};

module.exports = mongoose.model("Category", categorySchema);
