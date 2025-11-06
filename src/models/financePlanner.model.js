import mongoose from "mongoose";

const sinkingLineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amountUsd: {
    type: Number,
    required: true,
    min: 0,
  },
});

const financePlannerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Monthly income
    incomeUsd: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Budget caps as percentages
    caps: {
      INVEST: {
        type: Number,
        default: 25,
        min: 0,
        max: 100,
      },
      SINKING: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
      ESSENTIALS: {
        type: Number,
        default: 55,
        min: 0,
        max: 100,
      },
      DISCRETIONARY: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
    },
    // Planned transfers (auto-transfers on payday)
    plannedInvestUsd: {
      type: Number,
      default: 0,
      min: 0,
    },
    plannedSinkingUsd: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Sinking fund lines
    sinkingLines: [sinkingLineSchema],
    // Emergency fund balance
    emergencyFundUsd: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
financePlannerSchema.index({ userId: 1 });

export default mongoose.model("FinancePlanner", financePlannerSchema);


