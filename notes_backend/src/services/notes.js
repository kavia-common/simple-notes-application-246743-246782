'use strict';

const { all, get, run, transaction } = require('../db/sqlite');
const { HttpError } = require('../utils/http');

/**
 * Convert DB row to API note shape.
 * @param {any} row
 * @returns {{id:number,title:string,content:string,createdAt:string,updatedAt:string,favorite:boolean,tags:string[]}}
 */
function toNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorite: Boolean(row.is_favorite),
    tags: [],
  };
}

/**
 * Fetch tags for a set of note IDs.
 * @param {number[]} noteIds
 * @returns {Promise<Map<number, string[]>>}
 */
async function getTagsForNotes(noteIds) {
  if (!noteIds.length) return new Map();

  const placeholders = noteIds.map(() => '?').join(',');
  const rows = await all(
    `
    SELECT nt.note_id as note_id, t.name as name
    FROM note_tags nt
    JOIN tags t ON t.id = nt.tag_id
    WHERE nt.note_id IN (${placeholders})
    ORDER BY t.name COLLATE NOCASE ASC
    `,
    noteIds
  );

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.note_id)) map.set(r.note_id, []);
    map.get(r.note_id).push(r.name);
  }
  return map;
}

/**
 * Ensure tag rows exist and return tag IDs for the provided tag names.
 * @param {{run: Function, all: Function}} tx
 * @param {string[]} tagNames
 * @returns {Promise<number[]>}
 */
async function ensureTagIds(tx, tagNames) {
  if (!tagNames.length) return [];

  const ids = [];
  for (const name of tagNames) {
    // Insert if missing (case-insensitive unique index).
    await tx.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name]);
    const row = await tx.get('SELECT id FROM tags WHERE name = ? COLLATE NOCASE', [name]);
    if (row && row.id) ids.push(row.id);
  }
  return ids;
}

/**
 * Replace note's tags with provided tag IDs.
 * @param {{run: Function}} tx
 * @param {number} noteId
 * @param {number[]} tagIds
 * @returns {Promise<void>}
 */
async function setNoteTags(tx, noteId, tagIds) {
  await tx.run('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
  for (const tagId of tagIds) {
    await tx.run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId]);
  }
}

/**
 * Get note by id (with tags).
 * @param {number} id
 */
async function getNoteById(id) {
  const row = await get('SELECT * FROM notes WHERE id = ?', [id]);
  if (!row) throw new HttpError(404, 'Note not found.');
  const note = toNote(row);
  const tagsMap = await getTagsForNotes([id]);
  note.tags = tagsMap.get(id) || [];
  return note;
}

/**
 * List notes, newest updated first (with tags).
 */
async function listNotes() {
  const rows = await all('SELECT * FROM notes ORDER BY datetime(updated_at) DESC, id DESC');
  const notes = rows.map(toNote);
  const tagsMap = await getTagsForNotes(notes.map((n) => n.id));
  for (const n of notes) n.tags = tagsMap.get(n.id) || [];
  return notes;
}

/**
 * Search notes by query in title/content (with tags).
 * @param {string} q
 */
async function searchNotes(q) {
  const query = String(q || '').trim();
  if (!query) return [];

  // Use LIKE for SQLite; escaping is unnecessary for parameterized query.
  const like = `%${query}%`;
  const rows = await all(
    `
    SELECT * FROM notes
    WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'
    ORDER BY datetime(updated_at) DESC, id DESC
    `,
    [like, like]
  );
  const notes = rows.map(toNote);
  const tagsMap = await getTagsForNotes(notes.map((n) => n.id));
  for (const n of notes) n.tags = tagsMap.get(n.id) || [];
  return notes;
}

/**
 * Create a note (and optional tags).
 * @param {{title:string, content:string, tags:string[], favorite:boolean}} data
 */
async function createNote(data) {
  return transaction(async (tx) => {
    const result = await tx.run(
      `
      INSERT INTO notes (title, content, is_favorite, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `,
      [data.title, data.content, data.favorite ? 1 : 0]
    );

    const noteId = result.lastID;

    const tagIds = await ensureTagIds(tx, data.tags);
    await setNoteTags(tx, noteId, tagIds);

    return getNoteById(noteId);
  });
}

/**
 * Update a note by id. Supports partial update fields (via validated patch).
 * @param {number} id
 * @param {{title?:string, content?:string, tags?:string[], favorite?:boolean}} patch
 */
async function updateNote(id, patch) {
  return transaction(async (tx) => {
    const existing = await tx.get('SELECT * FROM notes WHERE id = ?', [id]);
    if (!existing) throw new HttpError(404, 'Note not found.');

    const title = patch.title !== undefined ? patch.title : existing.title;
    const content = patch.content !== undefined ? patch.content : existing.content;
    const isFavorite = patch.favorite !== undefined ? (patch.favorite ? 1 : 0) : existing.is_favorite;

    await tx.run(
      `
      UPDATE notes
      SET title = ?, content = ?, is_favorite = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [title, content, isFavorite, id]
    );

    if (patch.tags !== undefined) {
      const tagIds = await ensureTagIds(tx, patch.tags);
      await setNoteTags(tx, id, tagIds);
    }

    return getNoteById(id);
  });
}

/**
 * Delete note by id.
 * @param {number} id
 */
async function deleteNote(id) {
  const result = await run('DELETE FROM notes WHERE id = ?', [id]);
  if (result.changes === 0) throw new HttpError(404, 'Note not found.');
  return { ok: true };
}

/**
 * List tags with note counts.
 */
async function listTags() {
  const rows = await all(
    `
    SELECT t.name as name, COUNT(nt.note_id) as noteCount
    FROM tags t
    LEFT JOIN note_tags nt ON nt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name COLLATE NOCASE ASC
    `
  );
  return rows.map((r) => ({ name: r.name, noteCount: r.noteCount }));
}

/**
 * List favorite notes.
 */
async function listFavorites() {
  const rows = await all(
    `
    SELECT * FROM notes
    WHERE is_favorite = 1
    ORDER BY datetime(updated_at) DESC, id DESC
    `
  );
  const notes = rows.map(toNote);
  const tagsMap = await getTagsForNotes(notes.map((n) => n.id));
  for (const n of notes) n.tags = tagsMap.get(n.id) || [];
  return notes;
}

module.exports = {
  listNotes,
  searchNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  listTags,
  listFavorites,
};
