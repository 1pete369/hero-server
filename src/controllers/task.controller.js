// controllers/task.controller.js
import Task from "../models/task.model.js"
import User from "../models/user.model.js"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../helpers/googleCalendar.helper.js"

// 1. Create a new task
export const createTask = async (req, res) => {
  try {
    // Convert scheduledDate string to Date object if it's a string
    const taskData = { ...req.body, userId: req.user._id }
    if (taskData.scheduledDate && typeof taskData.scheduledDate === 'string') {
      // Convert YYYY-MM-DD string to Date object
      taskData.scheduledDate = new Date(taskData.scheduledDate + 'T00:00:00.000Z')
    }
    
    const task = new Task(taskData)
    const saved = await task.save()

    // Auto-sync to Google Calendar if enabled
    try {
      const user = await User.findById(req.user._id)
      if (user.calendarSyncEnabled && saved.scheduledDate && saved.startTime && saved.endTime) {
        const event = await createCalendarEvent(req.user._id, saved)
        saved.googleCalendarEventId = event.id
        saved.syncedToCalendar = true
        await saved.save()
      }
    } catch (syncError) {
      console.error("Failed to sync task to calendar:", syncError)
      // Don't fail the task creation if calendar sync fails
    }

    res.status(201).json(saved)
  } catch (err) {
    console.error("Create task error:", err)
    res.status(500).json({ error: "Failed to create task", details: err.message })
  }
}

// 2. Get all tasks (optionally filtered by ?date=YYYY-MM-DD)
export const getAllTasks = async (req, res) => {
  try {
    const { date } = req.query
    const filter = { userId: req.user._id }
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      filter.scheduledDate = { $gte: start, $lt: end }
    }

    const tasks = await Task.find(filter).sort({ startTime: 1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" })
  }
}

// 3. Get a specific task by ID
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!task) return res.status(404).json({ error: "Task not found" })
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch task" })
  }
}

// 4. Update a task (including scheduledDate)
export const updateTask = async (req, res) => {
  try {
    // Normalize scheduledDate if provided as YYYY-MM-DD string
    if (typeof req.body.scheduledDate === 'string' && req.body.scheduledDate) {
      req.body.scheduledDate = new Date(req.body.scheduledDate + 'T00:00:00.000Z')
    }
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    )

    if (!updated) return res.status(404).json({ error: "Task not found" })

    // Auto-sync to Google Calendar if enabled
    try {
      const user = await User.findById(req.user._id)
      if (user.calendarSyncEnabled) {
        if (updated.scheduledDate && updated.startTime && updated.endTime) {
          if (updated.googleCalendarEventId) {
            // Update existing event
            await updateCalendarEvent(req.user._id, updated, updated.googleCalendarEventId)
          } else {
            // Create new event
            const event = await createCalendarEvent(req.user._id, updated)
            updated.googleCalendarEventId = event.id
            updated.syncedToCalendar = true
            await updated.save()
          }
        } else if (updated.googleCalendarEventId) {
          // Task no longer has scheduling, remove from calendar
          await deleteCalendarEvent(req.user._id, updated.googleCalendarEventId)
          updated.googleCalendarEventId = null
          updated.syncedToCalendar = false
          await updated.save()
        }
      }
    } catch (syncError) {
      console.error("Failed to sync task to calendar:", syncError)
      // Don't fail the task update if calendar sync fails
    }

    res.json(updated)
  } catch (err) {
    console.error("Error updating task:", err.message)
    res.status(500).json({ error: "Failed to update task" })
  }
}

// 5. Delete a task
export const deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!deleted) return res.status(404).json({ error: "Task not found" })

    // Remove from Google Calendar if synced
    try {
      if (deleted.googleCalendarEventId) {
        await deleteCalendarEvent(req.user._id, deleted.googleCalendarEventId)
      }
    } catch (syncError) {
      console.error("Failed to delete event from calendar:", syncError)
      // Don't fail the task deletion if calendar sync fails
    }

    res.json({ message: "Task deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" })
  }
}

// 6. Toggle completion (adds/removes today's ISO date)
export const toggleTaskCompletion = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
    if (!task) return res.status(404).json({ error: "Task not found" })

    const todayISO = new Date().toISOString().slice(0, 10)
    const doneToday = task.completedDates.includes(todayISO)

    if (doneToday) {
      task.completedDates = task.completedDates.filter(d => d !== todayISO)
    } else {
      task.completedDates.push(todayISO)
    }

    if (task.recurring === "none") {
      task.isCompleted = !doneToday
    }

    await task.save()
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle task completion" })
  }
}

// 7. Analytics endpoint (simplified for auth backend)
export const getTaskAnalytics = async (req, res) => {
  const userId = req.user._id
  try {
    const tasks = await Task.find({ userId })
    const completedTasks = tasks.filter(task => task.isCompleted).length
    const totalTasks = tasks.length
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    const basic = {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate: Math.round(completionRate * 100) / 100
    }
    
    return res.status(200).json(basic)
  } catch (err) {
    console.error("Analytics Error:", err)
    res.status(500).json({ message: "Failed to load task analytics" })
  }
}

// 8. Start/Stop Timer
export const startTaskTimer = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) return res.status(404).json({ error: "Task not found" })

    if (task.activeTimerStartedAt) {
      return res.status(400).json({ error: "Timer already running" })
    }

    task.activeTimerStartedAt = new Date()
    await task.save()
    res.json(task)
  } catch (err) {
    console.error("Start timer error:", err)
    res.status(500).json({ error: "Failed to start timer" })
  }
}

export const stopTaskTimer = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id })
    if (!task) return res.status(404).json({ error: "Task not found" })

    if (!task.activeTimerStartedAt) {
      return res.status(400).json({ error: "No running timer" })
    }

    const startedAt = task.activeTimerStartedAt
    const endedAt = new Date()
    const durationMs = Math.max(0, endedAt.getTime() - new Date(startedAt).getTime())

    task.timeSessions.push({ startedAt, endedAt, durationMs })
    // Ensure Mongoose tracks nested array changes in all cases
    if (typeof task.markModified === 'function') {
      task.markModified('timeSessions')
    }
    task.totalTimeMs = (task.totalTimeMs || 0) + durationMs
    task.activeTimerStartedAt = null
    await task.save()

    res.json(task)
  } catch (err) {
    console.error("Stop timer error:", err)
    res.status(500).json({ error: "Failed to stop timer" })
  }
}
