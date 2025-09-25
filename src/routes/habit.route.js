import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import {
  createHabit,
  getAllHabits,
  updateHabit,
  deleteHabit,
  toggleHabitCompleted,
} from "../controllers/habit.controller.js"

const router = express.Router()

router.use(protectRoute)

router.post("/", createHabit)
router.get("/", getAllHabits)
router.patch("/:id", updateHabit)
router.delete("/:id", deleteHabit)
router.patch("/:id/complete", toggleHabitCompleted)

export default router


