// helpers/googleCalendar.helper.js
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import User from "../models/user.model.js";

/**
 * Get a valid Google OAuth client for a user
 * Refreshes the access token if needed
 */
export const getGoogleCalendarClient = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user || !user.googleId) {
    throw new Error("User not connected to Google");
  }

  if (!user.googleRefreshToken) {
    throw new Error("No Google refresh token found. Please reconnect your Google account.");
  }

  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALLBACK_URL,
  });

  // Set credentials
  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : null,
  });

  // Check if token needs refresh
  const now = new Date();
  if (!user.googleTokenExpiry || now >= new Date(user.googleTokenExpiry)) {
    console.log("Refreshing Google access token...");
    try {
      const { credentials } = await client.refreshAccessToken();
      
      // Update user with new tokens
      user.googleAccessToken = credentials.access_token;
      if (credentials.refresh_token) {
        user.googleRefreshToken = credentials.refresh_token;
      }
      if (credentials.expiry_date) {
        user.googleTokenExpiry = new Date(credentials.expiry_date);
      }
      await user.save();

      client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      throw new Error("Failed to refresh Google access token. Please reconnect your Google account.");
    }
  }

  return client;
};

/**
 * Create a Google Calendar event from a task
 */
export const createCalendarEvent = async (userId, task) => {
  try {
    const client = await getGoogleCalendarClient(userId);
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    // Build event start and end times
    if (!task.scheduledDate || !task.startTime || !task.endTime) {
      throw new Error("Task must have a scheduled date and time to sync with calendar");
    }

    const taskDate = new Date(task.scheduledDate);
    const year = taskDate.getUTCFullYear();
    const month = String(taskDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(taskDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const startDateTime = `${dateStr}T${task.startTime}:00`;
    const endDateTime = `${dateStr}T${task.endTime}:00`;

    const event = {
      summary: task.title,
      description: task.description || `Category: ${task.category}, Priority: ${task.priority}`,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      },
      colorId: getCalendarColorId(task.color),
    };

    // Handle recurring events
    if (task.recurring && task.recurring !== "none") {
      event.recurrence = [buildRecurrenceRule(task.recurring, task.days)];
    }

    const response = await axios.post(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      event,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating calendar event:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update a Google Calendar event
 */
export const updateCalendarEvent = async (userId, task, eventId) => {
  try {
    const client = await getGoogleCalendarClient(userId);
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    if (!task.scheduledDate || !task.startTime || !task.endTime) {
      // If task no longer has scheduling, delete the calendar event
      await deleteCalendarEvent(userId, eventId);
      return null;
    }

    const taskDate = new Date(task.scheduledDate);
    const year = taskDate.getUTCFullYear();
    const month = String(taskDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(taskDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const startDateTime = `${dateStr}T${task.startTime}:00`;
    const endDateTime = `${dateStr}T${task.endTime}:00`;

    const event = {
      summary: task.title,
      description: task.description || `Category: ${task.category}, Priority: ${task.priority}`,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
      },
      colorId: getCalendarColorId(task.color),
    };

    // Handle recurring events
    if (task.recurring && task.recurring !== "none") {
      event.recurrence = [buildRecurrenceRule(task.recurring, task.days)];
    }

    const response = await axios.put(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      event,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error updating calendar event:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete a Google Calendar event
 */
export const deleteCalendarEvent = async (userId, eventId) => {
  try {
    const client = await getGoogleCalendarClient(userId);
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    await axios.delete(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return true;
  } catch (error) {
    // If event not found (404), consider it successfully deleted
    if (error.response?.status === 404) {
      return true;
    }
    console.error("Error deleting calendar event:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Build RRULE for recurring events
 */
const buildRecurrenceRule = (recurring, days) => {
  if (recurring === "daily") {
    return "RRULE:FREQ=DAILY";
  }
  
  if (recurring === "weekly") {
    if (days && days.length > 0) {
      const dayMap = {
        sun: "SU",
        mon: "MO",
        tue: "TU",
        wed: "WE",
        thu: "TH",
        fri: "FR",
        sat: "SA",
      };
      const rruleDays = days.map((d) => dayMap[d] || "").filter(Boolean);
      return `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays.join(",")}`;
    }
    return "RRULE:FREQ=WEEKLY";
  }
  
  if (recurring === "monthly") {
    return "RRULE:FREQ=MONTHLY";
  }

  return "";
};

/**
 * Map task colors to Google Calendar color IDs
 */
const getCalendarColorId = (color) => {
  const colorMap = {
    blue: "9",      // Blue
    green: "10",    // Green
    purple: "3",    // Purple
    orange: "6",    // Orange
    red: "11",      // Red
    pink: "4",      // Pink
    indigo: "9",    // Blue (fallback)
    teal: "7",      // Cyan
    yellow: "5",    // Yellow
    gray: "8",      // Gray
  };
  return colorMap[color] || "9"; // Default to blue
};




