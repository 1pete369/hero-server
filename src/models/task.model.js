// models/task.model.js
import mongoose from "mongoose"

const taskSchema = new mongoose.Schema(
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
    isCompleted: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      required: false, // allow unscheduled tasks
      default: null,
    },
    endTime: {
      type: String,
      required: false, // allow unscheduled tasks
      default: null,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    recurring: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    days: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    completedDates: {
      type: [String],
      default: [],
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    // --- NEW: the scheduled date for the task ---
    scheduledDate: {
      type: Date,
      required: false, // allow unscheduled tasks
      default: null,
    },
    // --- NEW: color for the task card ---
    color: {
      type: String,
      enum: ["blue", "green", "purple", "orange", "red", "pink", "indigo", "teal", "yellow", "gray"],
      default: "blue",
    },
    // --- Google Calendar Integration ---
    googleCalendarEventId: {
      type: String,
      default: null,
    },
    syncedToCalendar: {
      type: Boolean,
      default: false,
    },
  // --- Focus Timer ---
  timeSessions: {
    type: [
      new mongoose.Schema(
        {
          startedAt: { type: Date, required: true },
          endedAt: { type: Date, default: null },
          durationMs: { type: Number, default: 0 },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  activeTimerStartedAt: {
    type: Date,
    default: null,
  },
  totalTimeMs: {
    type: Number,
    default: 0,
  },
  },
  { timestamps: true }
)

const Task = mongoose.model("Task", taskSchema)
export default Task
