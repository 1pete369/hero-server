// src/routes/goal.routes.js
import express from "express"
import {
  createGoal,
  deleteGoal,
  getAllGoals,
  getGoalById,
  updateGoal,
} from "../controllers/goal.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

const router = express.Router()

router.use(protectRoute)

router.post("/", createGoal)
router.get("/", getAllGoals)
router.get("/:id", getGoalById)
router.patch("/:id", updateGoal)
router.delete("/:id", deleteGoal)

export default router
