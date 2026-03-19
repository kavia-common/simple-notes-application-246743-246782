'use strict';

const notesService = require('../services/notes');
const { parseId, validateCreateNote, validateUpdateNote } = require('../utils/http');

class NotesController {
  async list(req, res) {
    const notes = await notesService.listNotes();
    return res.status(200).json(notes);
  }

  async search(req, res) {
    const q = req.query && req.query.q ? String(req.query.q) : '';
    const notes = await notesService.searchNotes(q);
    return res.status(200).json(notes);
  }

  async getById(req, res) {
    const id = parseId(req.params.id);
    const note = await notesService.getNoteById(id);
    return res.status(200).json(note);
  }

  async create(req, res) {
    const data = validateCreateNote(req.body);
    const note = await notesService.createNote(data);
    return res.status(201).json(note);
  }

  async update(req, res) {
    const id = parseId(req.params.id);
    const patch = validateUpdateNote(req.body);
    const note = await notesService.updateNote(id, patch);
    return res.status(200).json(note);
  }

  async remove(req, res) {
    const id = parseId(req.params.id);
    const result = await notesService.deleteNote(id);
    return res.status(200).json(result);
  }
}

module.exports = new NotesController();
