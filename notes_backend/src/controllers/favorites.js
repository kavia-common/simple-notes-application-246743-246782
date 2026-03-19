'use strict';

const notesService = require('../services/notes');

class FavoritesController {
  async list(req, res) {
    const notes = await notesService.listFavorites();
    return res.status(200).json(notes);
  }
}

module.exports = new FavoritesController();
