// controllers/calendar.controller.js
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../helpers/googleCalendar.helper.js";

/**
 * Check if user has calendar sync enabled
 */
export const getCalendarSyncStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      syncEnabled: user.calendarSyncEnabled || false,
      hasGoogleAccount: !!user.googleId,
      hasRefreshToken: !!user.googleRefreshToken,
    });
  } catch (error) {
    console.error("Error checking calendar sync status:", error);
    res.status(500).json({ error: "Failed to check calendar sync status" });
  }
};

/**
 * Enable/disable calendar sync
 */
export const toggleCalendarSync = async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.googleId || !user.googleRefreshToken) {
      return res.status(400).json({ 
        error: "Please connect your Google account first to enable calendar sync" 
      });
    }

    user.calendarSyncEnabled = enabled;
    await user.save();

    res.json({
      syncEnabled: user.calendarSyncEnabled,
      message: enabled ? "Calendar sync enabled" : "Calendar sync disabled",
    });
  } catch (error) {
    console.error("Error toggling calendar sync:", error);
    res.status(500).json({ error: "Failed to toggle calendar sync" });
  }
};

/**
 * Sync a single task to Google Calendar
 */
export const syncTaskToCalendar = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if user has calendar sync enabled
    const user = await User.findById(userId);
    if (!user.calendarSyncEnabled) {
      return res.status(400).json({ 
        error: "Calendar sync is not enabled. Please enable it first." 
      });
    }

    // Check if task has required fields for calendar sync
    if (!task.scheduledDate || !task.startTime || !task.endTime) {
      return res.status(400).json({ 
        error: "Task must have a scheduled date and time to sync with calendar" 
      });
    }

    let eventId = task.googleCalendarEventId;

    if (eventId) {
      // Update existing calendar event
      const updatedEvent = await updateCalendarEvent(userId, task, eventId);
      if (!updatedEvent) {
        // Event was deleted because task no longer has scheduling
        task.googleCalendarEventId = null;
        task.syncedToCalendar = false;
      }
    } else {
      // Create new calendar event
      const newEvent = await createCalendarEvent(userId, task);
      task.googleCalendarEventId = newEvent.id;
      task.syncedToCalendar = true;
    }

    await task.save();

    res.json({
      success: true,
      task,
      message: "Task synced to Google Calendar",
    });
  } catch (error) {
    console.error("Error syncing task to calendar:", error);
    res.status(500).json({ 
      error: error.message || "Failed to sync task to calendar" 
    });
  }
};

/**
 * Sync all tasks to Google Calendar
 */
export const syncAllTasksToCalendar = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user has calendar sync enabled
    const user = await User.findById(userId);
    if (!user.calendarSyncEnabled) {
      return res.status(400).json({ 
        error: "Calendar sync is not enabled. Please enable it first." 
      });
    }

    // Get all tasks with scheduling info that aren't synced yet
    const tasks = await Task.find({
      userId,
      scheduledDate: { $ne: null },
      startTime: { $ne: null },
      endTime: { $ne: null },
    });

    let syncedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const task of tasks) {
      try {
        let eventId = task.googleCalendarEventId;

        if (eventId) {
          // Update existing calendar event
          await updateCalendarEvent(userId, task, eventId);
        } else {
          // Create new calendar event
          const newEvent = await createCalendarEvent(userId, task);
          task.googleCalendarEventId = newEvent.id;
          task.syncedToCalendar = true;
          await task.save();
        }

        syncedCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          taskId: task._id,
          taskTitle: task.title,
          error: error.message,
        });
        console.error(`Failed to sync task ${task._id}:`, error);
      }
    }

    res.json({
      success: true,
      syncedCount,
      failedCount,
      totalTasks: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount} tasks to Google Calendar`,
    });
  } catch (error) {
    console.error("Error syncing all tasks to calendar:", error);
    res.status(500).json({ 
      error: error.message || "Failed to sync tasks to calendar" 
    });
  }
};

/**
 * Remove a task from Google Calendar
 */
export const unsyncTaskFromCalendar = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (!task.googleCalendarEventId) {
      return res.status(400).json({ 
        error: "Task is not synced to calendar" 
      });
    }

    // Delete from Google Calendar
    await deleteCalendarEvent(userId, task.googleCalendarEventId);

    // Update task
    task.googleCalendarEventId = null;
    task.syncedToCalendar = false;
    await task.save();

    res.json({
      success: true,
      task,
      message: "Task removed from Google Calendar",
    });
  } catch (error) {
    console.error("Error removing task from calendar:", error);
    res.status(500).json({ 
      error: error.message || "Failed to remove task from calendar" 
    });
  }
};




