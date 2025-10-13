import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, enum: ["personal", "work", "learning", "ideas"], default: "personal" },
    color: { type: String, enum: [
      "yellow", "pink", "blue", "green", "purple", "orange", "gray", "white", "black"
    ], default: "yellow" },
    tags: { type: [String], default: [] },
    isPinned: { type: Boolean, default: false },
    linkedGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal" },
    linkedHabitId: { type: mongoose.Schema.Types.ObjectId, ref: "Habit" },
    linkedTodoId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });

const Note = mongoose.model("Note", noteSchema);
export default Note;


