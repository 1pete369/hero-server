import Habit from "../models/habit.model.js"
import Goal from "../models/goal.model.js"
import { updateGoalProgress } from "../helpers/goal.helper.js"

// Normalize a Date/ISO string to YYYY-MM-DD
const toISODate = (d) => new Date(d).toISOString().split("T")[0]

// Compute current streak ending today (consecutive days up to today)
const computeCurrentStreak = (isoDatesSet) => {
  let streak = 0
  const today = new Date()
  for (;;) {
    const dateStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - streak)
    const iso = dateStr.toISOString().split("T")[0]
    if (isoDatesSet.has(iso)) {
      streak += 1
      continue
    }
    break
  }
  return streak
}

// Compute longest consecutive streak in provided YYYY-MM-DD set
const computeLongestStreak = (isoDates) => {
  if (isoDates.length === 0) return 0
  const set = new Set(isoDates)
  let longest = 0
  for (const d of set) {
    // If previous day is not present, start a chain
    const [y, m, da] = d.split("-").map(Number)
    const prev = new Date(y, m - 1, da - 1).toISOString().split("T")[0]
    if (!set.has(prev)) {
      // Walk forward
      let length = 1
      let curY = y, curM = m - 1, curD = da
      for (;;) {
        const next = new Date(curY, curM, curD + 1).toISOString().split("T")[0]
        if (set.has(next)) {
          length += 1
          const [ny, nm, nd] = next.split("-").map(Number)
          curY = ny; curM = nm - 1; curD = nd
        } else break
      }
      if (length > longest) longest = length
    }
  }
  return longest
}

export const createHabit = async (req, res) => {
  try {
    const {
      title,
      description = "",
      frequency,
      days = [],
      startDate,
      icon = "🎯",
      category,
      linkedGoalId = null,
    } = req.body

    const newHabit = await Habit.create({
      userId: req.user._id,
      title,
      description,
      frequency,
      days,
      startDate,
      icon,
      category,
      linkedGoalId,
    })

    if (linkedGoalId) {
      await Goal.findByIdAndUpdate(linkedGoalId, { $addToSet: { linkedHabits: newHabit._id } })
      await updateGoalProgress(linkedGoalId)
    }

    res.status(201).json(newHabit)
  } catch (err) {
    res.status(500).json({ error: "Failed to create habit", details: err.message })
  }
}

export const getAllHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id }).populate("linkedGoalId")
    res.status(200).json(habits)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch habits", details: err.message })
  }
}

export const updateHabit = async (req, res) => {
  try {
    const updates = { ...req.body }
    delete updates.userId

    const currentHabit = await Habit.findOne({ _id: req.params.id, userId: req.user._id })
    if (!currentHabit) return res.status(404).json({ error: "Habit not found" })

    const oldLinkedGoalId = currentHabit.linkedGoalId?.toString() || null
    const newLinkedGoalId = updates.linkedGoalId || null

    const updatedHabit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true }
    )

    if (oldLinkedGoalId !== newLinkedGoalId) {
      if (oldLinkedGoalId) {
        await Goal.findByIdAndUpdate(oldLinkedGoalId, { $pull: { linkedHabits: req.params.id } })
        await updateGoalProgress(oldLinkedGoalId)
      }
      if (newLinkedGoalId) {
        await Goal.findByIdAndUpdate(newLinkedGoalId, { $addToSet: { linkedHabits: req.params.id } })
        await updateGoalProgress(newLinkedGoalId)
      }
    }

    res.status(200).json(updatedHabit)
  } catch (err) {
    res.status(500).json({ error: "Failed to update habit", details: err.message })
  }
}

export const deleteHabit = async (req, res) => {
  try {
    const deletedHabit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!deletedHabit) return res.status(404).json({ error: "Habit not found" })

    if (deletedHabit.linkedGoalId) {
      await Goal.findByIdAndUpdate(deletedHabit.linkedGoalId, { $pull: { linkedHabits: deletedHabit._id } })
      await updateGoalProgress(deletedHabit.linkedGoalId)
    }

    res.status(200).json({ message: "Habit deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete habit", details: err.message })
  }
}

export const toggleHabitCompleted = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    const habit = await Habit.findOne({ _id: id, userId })
    if (!habit) return res.status(404).json({ error: "Habit not found" })

    const todayDate = new Date().toISOString().split("T")[0]

    const isMarked = habit.completedDates.some(
      (date) => new Date(date).toISOString().split("T")[0] === todayDate
    )

    if (isMarked) {
      habit.completedDates = habit.completedDates.filter(
        (date) => new Date(date).toISOString().split("T")[0] !== todayDate
      )
      habit.lastCompletedAt = null
    } else {
      habit.completedDates.push(new Date().toISOString())
      habit.lastCompletedAt = new Date()
    }

    // Recompute streaks
    const isoDates = habit.completedDates
      .map((d) => toISODate(d))
      .sort()
    const isoSet = new Set(isoDates)
    const currentStreak = computeCurrentStreak(isoSet)
    const longestStreak = Math.max(habit.longestStreak || 0, computeLongestStreak(isoDates))

    habit.streak = currentStreak
    habit.longestStreak = longestStreak

    await habit.save()

    if (habit.linkedGoalId) {
      await updateGoalProgress(habit.linkedGoalId)
    }

    return res.status(200).json({ success: true, habit })
  } catch (err) {
    console.error("Toggle Habit Error:", err)
    return res.status(500).json({ error: "Something went wrong" })
  }
}


