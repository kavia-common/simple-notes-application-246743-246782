'use strict';

const notesService = require('../services/notes');

class TagsController {
  async list(req, res) {
    const tags = await notesService.listTags();
    return res.status(200).json(tags);
  }
}

module.exports = new TagsController();
