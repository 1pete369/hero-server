import mongoose from 'mongoose'

const CompletedSetSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true },
    weight: { type: Number, default: 0 },
    rpe: { type: Number, min: 1, max: 10 },
    notes: { type: String, default: '' },
  },
  { _id: false }
)

const SessionExerciseSchema = new mongoose.Schema(
  {
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExerciseTemplate', required: true },
    sets: { type: [CompletedSetSchema], default: [] },
  },
  { _id: false }
)

const WorkoutSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    routineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine' },
    date: { type: Date, required: true },
    exercises: { type: [SessionExerciseSchema], default: [] },
    notes: { type: String, default: '' },
    perceivedEffort: { type: Number, min: 1, max: 10 },
  },
  { timestamps: true }
)

export default mongoose.model('WorkoutSession', WorkoutSessionSchema)


