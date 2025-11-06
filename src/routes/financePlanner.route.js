import express from "express";
import {
  getPlannerProfile,
  updatePlannerProfile,
  getPlannerDashboard,
  weeklyCheck,
  monthlyReset,
} from "../controllers/financePlanner.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Profile routes
router.get("/profile", getPlannerProfile);
router.put("/profile", updatePlannerProfile);

// Dashboard route
router.get("/dashboard", getPlannerDashboard);

// Action routes
router.get("/weekly-check", weeklyCheck);
router.post("/monthly-reset", monthlyReset);

export default router;


