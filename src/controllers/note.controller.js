import Note from "../models/note.model.js";

export const createNote = async (req, res) => {
  try {
    const { title, content, category = "personal", tags = [], isPinned = false, linkedGoalId, linkedHabitId, linkedTodoId } = req.body;
    const note = await Note.create({
      userId: req.user._id,
      title,
      content,
      category,
      tags,
      isPinned,
      linkedGoalId,
      linkedHabitId,
      linkedTodoId,
    });
    return res.status(201).json(note);
  } catch (err) {
    return res.status(500).json({ error: "Could not create note" });
  }
};

export const getAllNotes = async (req, res) => {
  try {
    const { category, search, tags, isPinned } = req.query;
    const filter = { userId: req.user._id };

    if (category && category !== "all") filter.category = category;
    if (typeof isPinned !== "undefined") filter.isPinned = String(isPinned) === "true";
    if (tags) filter.tags = { $in: String(tags).split(",").map((t) => t.trim()).filter(Boolean) };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const notes = await Note.find(filter).sort({ isPinned: -1, createdAt: -1 });
    return res.status(200).json(notes);
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch notes" });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ error: "Note not found" });
    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch note" });
  }
};

export const updateNote = async (req, res) => {
  try {
    const update = { ...req.body, updatedAt: Date.now() };
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!note) return res.status(404).json({ error: "Note not found or not owned by you" });
    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ error: "Could not update note" });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ error: "Note not found or not owned by you" });
    return res.status(200).json({ message: "Note deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Could not delete note" });
  }
};

export const togglePinNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ error: "Note not found or not owned by you" });
    note.isPinned = !note.isPinned;
    await note.save();
    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ error: "Could not toggle pin status" });
  }
};


