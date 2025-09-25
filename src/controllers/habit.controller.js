import Habit from "../models/habit.model.js"
import Goal from "../models/goal.model.js"
import { updateGoalProgress } from "../helpers/goal.helper.js"

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

    const today = new Date().toISOString()
    const todayDate = new Date(today).toISOString().split("T")[0]

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


