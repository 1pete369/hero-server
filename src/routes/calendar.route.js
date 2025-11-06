// routes/calendar.route.js
import express from "express";
import {
  getCalendarSyncStatus,
  toggleCalendarSync,
  syncTaskToCalendar,
  syncAllTasksToCalendar,
  unsyncTaskFromCalendar,
} from "../controllers/calendar.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protect all calendar routes
router.use(protectRoute);

// Get calendar sync status
router.get("/status", getCalendarSyncStatus);

// Enable/disable calendar sync
router.post("/toggle", toggleCalendarSync);

// Sync all tasks to calendar
router.post("/sync-all", syncAllTasksToCalendar);

// Sync a single task to calendar
router.post("/sync/:taskId", syncTaskToCalendar);

// Remove a task from calendar
router.delete("/sync/:taskId", unsyncTaskFromCalendar);

export default router;




