import mongoose from 'mongoose'

const ExerciseTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    muscleGroup: { type: String, enum: ['chest','back','legs','shoulders','arms','core','full'], default: 'full' },
    defaultSets: { type: Number, default: 3 },
    defaultReps: { type: Number, default: 10 },
    defaultWeight: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('ExerciseTemplate', ExerciseTemplateSchema)


