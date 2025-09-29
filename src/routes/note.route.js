import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createNote, getAllNotes, getNoteById, updateNote, deleteNote, togglePinNote } from "../controllers/note.controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createNote);
router.get("/", getAllNotes);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/toggle-pin", togglePinNote);

export default router;


