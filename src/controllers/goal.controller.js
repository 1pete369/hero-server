import Goal from "../models/goal.model.js"
import Habit from "../models/habit.model.js"
import { updateGoalProgress } from "../helpers/goal.helper.js"

// ✅ Auto-complete expired goals
const autoCompleteExpiredGoals = async (userId) => {
  try {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const expiredGoals = await Goal.find({
      userId,
      status: "active",
      targetDate: { $lt: today }
    })
    
    if (expiredGoals.length > 0) {
      // First, mark goals as completed
      await Goal.updateMany(
        { _id: { $in: expiredGoals.map(g => g._id) } },
        { 
          $set: { 
            status: "completed", 
            isCompleted: true
          } 
        }
      )
      
      // Then, for each expired goal: mark linked habits as completed and recalc goal progress
      for (const goal of expiredGoals) {
        try {
          if (Array.isArray(goal.linkedHabits) && goal.linkedHabits.length > 0) {
            await Habit.updateMany(
              { _id: { $in: goal.linkedHabits } },
              { $set: { status: "completed", endDate: goal.targetDate } }
            )
          }
          await updateGoalProgress(goal._id)
        } catch (innerErr) {
          console.error("Error finalizing expired goal:", goal._id, innerErr)
        }
      }
      
      console.log(`Auto-completed ${expiredGoals.length} expired goals for user ${userId}`)
    }
  } catch (err) {
    console.error("Error auto-completing expired goals:", err)
  }
}

// ✅ Create a new goal
export const createGoal = async (req, res) => {
  try {
    const {
      title,
      description,
      targetDate,
      priority,
      category,
      linkedHabits = [], // ✅ fallback to empty array
    } = req.body

    // Normalize targetDate to a Date object at UTC noon to avoid timezone shifts
    let normalizedTargetDate = null
    if (targetDate) {
      if (typeof targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        const [y, m, d] = targetDate.split("-").map(Number)
        normalizedTargetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      } else {
        normalizedTargetDate = new Date(targetDate)
      }
    }

    const newGoal = await Goal.create({
      userId: req.user._id,
      title,
      description,
      targetDate: normalizedTargetDate,
      priority,
      category,
      linkedHabits,
    })

    res.status(201).json(newGoal)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create goal", details: err.message })
  }
}

// ✅ Get all goals for user
export const getAllGoals = async (req, res) => {
  try {
    // First, auto-complete expired goals
    await autoCompleteExpiredGoals(req.user._id)
    
    const goals = await Goal.find({ userId: req.user._id }).populate("linkedHabits")
    res.status(200).json(goals)
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch goals", details: err.message })
  }
}

// ✅ Get single goal by ID
export const getGoalById = async (req, res) => {
  try {
    // First, auto-complete expired goals
    await autoCompleteExpiredGoals(req.user._id)
    
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("linkedHabits")

    if (!goal) return res.status(404).json({ error: "Goal not found" })

    res.status(200).json(goal)
  } catch (err) {
    res.status(500).json({ error: "Failed to get goal", details: err.message })
  }
}

// ✅ Update a goal
export const updateGoal = async (req, res) => {
  try {
    const updates = { ...req.body }
    const goalId = req.params.id
    const userId = req.user._id

    // Get the current goal to check if it's expired
    const currentGoal = await Goal.findOne({ _id: goalId, userId })
    if (!currentGoal) return res.status(404).json({ error: "Goal not found" })

    // Check if goal is expired and prevent editing
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (currentGoal.status === "completed" && currentGoal.targetDate < today) {
      return res.status(400).json({ 
        error: "Cannot edit expired goal", 
        message: "This goal has passed its deadline and is marked as completed. Editing is disabled." 
      })
    }

    // Normalize targetDate if present
    if (updates.targetDate) {
      if (typeof updates.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(updates.targetDate)) {
        const [y, m, d] = updates.targetDate.split("-").map(Number)
        updates.targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
      } else {
        updates.targetDate = new Date(updates.targetDate)
      }
    }

    const updated = await Goal.findOneAndUpdate(
      { _id: goalId, userId },
      updates,
      { new: true }
    )

    // If goal is marked completed now, finalize linked habits and recalc progress
    if (updated && (updates.status === "completed" || updates.isCompleted === true)) {
      try {
        if (Array.isArray(updated.linkedHabits) && updated.linkedHabits.length > 0) {
          await Habit.updateMany(
            { _id: { $in: updated.linkedHabits } },
            { $set: { status: "completed", endDate: updated.targetDate } }
          )
        }
        await updateGoalProgress(updated._id)
      } catch (finalizeErr) {
        console.error("Error finalizing linked habits for completed goal:", updated._id, finalizeErr)
      }
    }

    res.status(200).json(updated)
  } catch (err) {
    console.error("Update goal error:", err)
    res
      .status(500)
      .json({ error: "Failed to update goal", details: err.message })
  }
}

// ✅ Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const deleted = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!deleted) return res.status(404).json({ error: "Goal not found" })

    res.status(200).json({ message: "Goal deleted successfully" })
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete goal", details: err.message })
  }
}
