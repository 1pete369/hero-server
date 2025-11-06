// src/models/habit.model.js

import mongoose from "mongoose"

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    days: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    completedDates: {
      type: [Date],
      default: [],
    },
    streak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCompletedAt: {
      type: Date,
      default: null,
    },
    linkedGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
    icon: {
      type: String,
      default: "🎯",
    },
    category: {
      type: String,
      default: "General",
    },
    color: {
      type: String,
      enum: ["blue", "green", "purple", "orange", "red", "pink", "indigo", "teal", "yellow", "gray"],
      default: "blue",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
)

habitSchema.index({ userId: 1 })
habitSchema.index({ linkedGoalId: 1 })
habitSchema.index({ completedDates: 1 })

const Habit = mongoose.model("Habit", habitSchema)
export default Habit


