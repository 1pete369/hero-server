import Habit from "../models/habit.model.js"
import Goal from "../models/goal.model.js"
import { updateGoalProgress } from "../helpers/goal.helper.js"

// ✅ Auto-complete expired habits
const autoCompleteExpiredHabits = async (userId) => {
  try {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    const expiredHabits = await Habit.find({
      userId,
      status: "active",
      endDate: { $lt: today, $ne: null }
    })
    
    if (expiredHabits.length > 0) {
      await Habit.updateMany(
        { _id: { $in: expiredHabits.map(h => h._id) } },
        { 
          $set: { 
            status: "completed"
          } 
        }
      )
      console.log(`Auto-completed ${expiredHabits.length} expired habits for user ${userId}`)
    }
  } catch (err) {
    console.error("Error auto-completing expired habits:", err)
  }
}

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

    // Ensure weekly habits have at least one weekday selected; default to startDate's weekday
    let normalizedDays = Array.isArray(days) ? days : []
    if (frequency === 'weekly' && normalizedDays.length === 0) {
      const dow = new Date(startDate).getUTCDay() // 0-6
      const map = ['sun','mon','tue','wed','thu','fri','sat']
      normalizedDays = [map[dow]]
    }

    const newHabit = await Habit.create({
      userId: req.user._id,
      title,
      description,
      frequency,
      days: normalizedDays,
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

// Check if a habit should be completed on a specific date based on its frequency
const shouldBeCompletedOnDate = (habit, dateStr) => {
  if (habit.frequency === 'daily') {
    return true
  }
  
  if (habit.frequency === 'weekly') {
    const dayOfWeek = new Date(dateStr).getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const targetDay = dayNames[dayOfWeek]
    return habit.days && habit.days.includes(targetDay)
  }
  
  if (habit.frequency === 'monthly') {
    // For monthly habits, check if it's the same day of the month as startDate
    const startDate = new Date(habit.startDate)
    const startDay = startDate.getDate()
    const checkDate = new Date(dateStr)
    return checkDate.getDate() === startDay
  }
  
  return false
}

// Check for missed days and reset streaks if necessary
const checkAndResetStreaks = async (habits) => {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  for (const habit of habits) {
    let needsUpdate = false
    const completedDatesSet = new Set(
      habit.completedDates.map(d => new Date(d).toISOString().split('T')[0])
    )
    
    // Check if habit was completed today
    const completedToday = completedDatesSet.has(today)
    
    // Only reset streak if:
    // 1. Habit wasn't completed today AND
    // 2. Habit should have been completed yesterday but wasn't
    if (!completedToday && shouldBeCompletedOnDate(habit, yesterday) && !completedDatesSet.has(yesterday)) {
      habit.streak = 0
      needsUpdate = true
      console.log(`Habit "${habit.title}" streak reset to 0 - missed yesterday (${yesterday})`)
    }
    
    if (needsUpdate) {
      await habit.save()
    }
  }
}

export const getAllHabits = async (req, res) => {
  try {
    // First, auto-complete expired habits
    await autoCompleteExpiredHabits(req.user._id)
    
    const habits = await Habit.find({ userId: req.user._id }).populate("linkedGoalId")
    
    // Check for missed days and reset streaks if necessary
    await checkAndResetStreaks(habits)
    
    // Re-fetch habits to get updated streak values
    const updatedHabits = await Habit.find({ userId: req.user._id }).populate("linkedGoalId")
    
    res.status(200).json(updatedHabits)
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

    // Check if habit is expired and prevent editing
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (currentHabit.status === "completed" && currentHabit.endDate && currentHabit.endDate < today) {
      return res.status(400).json({ 
        error: "Cannot edit expired habit", 
        message: "This habit has passed its deadline and is marked as completed. Editing is disabled." 
      })
    }

    const oldLinkedGoalId = currentHabit.linkedGoalId?.toString() || null
    const newLinkedGoalId = updates.linkedGoalId || null

    // Normalize weekly days if missing/empty
    if ((updates.frequency === 'weekly') || (currentHabit.frequency === 'weekly' && !updates.frequency)) {
      const incomingDays = Array.isArray(updates.days) ? updates.days : currentHabit.days
      if (!incomingDays || incomingDays.length === 0) {
        const srcDate = updates.startDate ? new Date(updates.startDate) : new Date(currentHabit.startDate)
        const dow = srcDate.getUTCDay()
        const map = ['sun','mon','tue','wed','thu','fri','sat']
        updates.days = [map[dow]]
      }
    }

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

    const today = new Date()
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString().split("T")[0]

    const isMarked = habit.completedDates.some(
      (date) => new Date(date).toISOString().split("T")[0] === todayDate
    )

    // Enforce weekly rules: only the configured weekday; once per week
    if (habit.frequency === 'weekly') {
      const map = ['sun','mon','tue','wed','thu','fri','sat']
      const todayKey = map[new Date().getUTCDay()]
      const validDay = Array.isArray(habit.days) && habit.days.length > 0 && habit.days.includes(todayKey)
      if (!validDay) {
        return res.status(400).json({ error: 'Weekly habit can only be completed on its selected weekday' })
      }
      // Check if already completed this week (Mon-Sun window aligned to UTC Sunday start)
      const d = new Date()
      const utcDay = d.getUTCDay() // 0..6
      const startOfWeek = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - utcDay))
      const endOfWeek = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (6 - utcDay)))
      const alreadyThisWeek = habit.completedDates.some(cd => {
        const x = new Date(cd)
        return x >= startOfWeek && x <= endOfWeek
      })
      if (!isMarked && alreadyThisWeek) {
        return res.status(400).json({ error: 'Weekly habit already completed this week' })
      }
    }

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


