import mongoose from "mongoose";

const financeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: [
        // Income categories
        "salary",
        "freelance",
        "investment",
        "business",
        "gift",
        "other_income",
        // Expense categories
        "food",
        "transportation",
        "entertainment",
        "shopping",
        "bills",
        "healthcare",
        "education",
        "travel",
        "subscriptions",
        "other_expense",
      ],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 20,
    }],
    recurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },
    recurringEndDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
financeSchema.index({ userId: 1, date: -1 });
financeSchema.index({ userId: 1, type: 1, category: 1 });

export default mongoose.model("Finance", financeSchema);
