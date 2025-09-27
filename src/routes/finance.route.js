import express from "express";
import {
  createTransaction,
  deleteTransaction,
  getFinancialSummary,
  getTransaction,
  getTransactions,
  updateTransaction,
} from "../controllers/finance.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Transaction CRUD routes
router.get("/", getTransactions);
router.get("/summary", getFinancialSummary);
router.get("/:id", getTransaction);
router.post("/", createTransaction);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
