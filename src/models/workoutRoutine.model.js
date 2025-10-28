import mongoose from 'mongoose'

const RoutineSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    days: [{ type: String, enum: ['sun','mon','tue','wed','thu','fri','sat'] }],
    exercises: [
      {
        exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', required: true },
        order: { type: Number, default: 0 },
        sets: { type: Number, default: 3 },
        reps: { type: Number, default: 10 },
        weight: { type: Number, default: 0 },
      }
    ],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('Routine', RoutineSchema)


