import express from "express";
import { completeOnboarding, getOnboardingStatus } from "../controllers/onboarding.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/complete", protectRoute, completeOnboarding);
router.get("/status", protectRoute, getOnboardingStatus);

export default router;

