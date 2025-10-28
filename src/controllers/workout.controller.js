import ExerciseTemplate from '../models/workoutExercise.model.js'
import Routine from '../models/workoutRoutine.model.js'
import WorkoutSession from '../models/workoutSession.model.js'

// Helpers
const getUserId = (req) => req.user?._id || req.userId || req.user?.id

// Exercises
export const createExercise = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const exercise = await ExerciseTemplate.create({ userId, ...req.body })
    res.status(201).json(exercise)
  } catch (e) { next(e) }
}

export const listExercises = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const items = await ExerciseTemplate.find({ userId, isArchived: { $ne: true } }).sort({ createdAt: -1 })
    res.json(items)
  } catch (e) { next(e) }
}

export const updateExercise = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const updated = await ExerciseTemplate.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true })
    res.json(updated)
  } catch (e) { next(e) }
}

export const archiveExercise = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    await ExerciseTemplate.findOneAndUpdate({ _id: req.params.id, userId }, { isArchived: true })
    res.status(204).end()
  } catch (e) { next(e) }
}

// Routines
export const createRoutine = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const routine = await Routine.create({ userId, ...req.body })
    res.status(201).json(routine)
  } catch (e) { next(e) }
}

export const listRoutines = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const items = await Routine.find({ userId, isArchived: { $ne: true } }).sort({ createdAt: -1 })
    res.json(items)
  } catch (e) { next(e) }
}

export const updateRoutine = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const updated = await Routine.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true })
    res.json(updated)
  } catch (e) { next(e) }
}

export const archiveRoutine = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    await Routine.findOneAndUpdate({ _id: req.params.id, userId }, { isArchived: true })
    res.status(204).end()
  } catch (e) { next(e) }
}

// Sessions
export const createSession = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const session = await WorkoutSession.create({ userId, ...req.body })
    res.status(201).json(session)
  } catch (e) { next(e) }
}

export const listSessions = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const { from, to } = req.query
    const filter = { userId }
    if (from || to) {
      filter.date = {}
      if (from) filter.date.$gte = new Date(from)
      if (to) filter.date.$lte = new Date(to)
    }
    const items = await WorkoutSession.find(filter).sort({ date: -1 })
    res.json(items)
  } catch (e) { next(e) }
}

export const getSession = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const item = await WorkoutSession.findOne({ _id: req.params.id, userId })
    res.json(item)
  } catch (e) { next(e) }
}

export const updateSession = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const updated = await WorkoutSession.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true })
    res.json(updated)
  } catch (e) { next(e) }
}

export const deleteSession = async (req, res, next) => {
  try {
    const userId = getUserId(req)
    await WorkoutSession.findOneAndDelete({ _id: req.params.id, userId })
    res.status(204).end()
  } catch (e) { next(e) }
}


