import express from "express";
import { checkAuth, login, logout, signup, updateProfile, googleLogin, googleOAuthStart, googleOAuthCallback } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/google", googleLogin);
router.get("/google/oauth", googleOAuthStart);
router.get("/google/callback", googleOAuthCallback);
router.get("/check", protectRoute, checkAuth);
router.put("/profile", protectRoute, updateProfile);

export default router;


