'use strict';

/**
 * Standard API error response shape.
 * { error: string, details?: any }
 */

class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {any} [details]
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Wrap an async express handler and forward errors to next().
 * @param {(req: any, res: any, next: any) => Promise<any>} fn
 * @returns {(req: any, res: any, next: any) => void}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate that a value is a positive integer id.
 * @param {any} value
 * @returns {number}
 */
function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid id. Must be a positive integer.');
  }
  return id;
}

/**
 * Validate request body for note creation.
 * @param {any} body
 * @returns {{title: string, content: string, tags: string[], favorite: boolean}}
 */
function validateCreateNote(body) {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'Invalid JSON body.');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const favorite = typeof body.favorite === 'boolean' ? body.favorite : false;

  if (!title) {
    throw new HttpError(400, 'Title is required.');
  }
  if (title.length > 200) {
    throw new HttpError(400, 'Title must be 200 characters or fewer.');
  }
  if (content.length > 20000) {
    throw new HttpError(400, 'Content must be 20000 characters or fewer.');
  }

  const tags = normalizeTags(body.tags);

  return { title, content, tags, favorite };
}

/**
 * Validate request body for note updates.
 * @param {any} body
 * @returns {{title?: string, content?: string, tags?: string[], favorite?: boolean}}
 */
function validateUpdateNote(body) {
  if (!body || typeof body !== 'object') {
    throw new HttpError(400, 'Invalid JSON body.');
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new HttpError(400, 'Title cannot be empty.');
    if (title.length > 200) throw new HttpError(400, 'Title must be 200 characters or fewer.');
    patch.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'content')) {
    const content = typeof body.content === 'string' ? body.content : '';
    if (content.length > 20000) throw new HttpError(400, 'Content must be 20000 characters or fewer.');
    patch.content = content;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'favorite')) {
    if (typeof body.favorite !== 'boolean') throw new HttpError(400, 'favorite must be a boolean.');
    patch.favorite = body.favorite;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
    patch.tags = normalizeTags(body.tags);
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'No updatable fields provided.');
  }

  return patch;
}

/**
 * Normalize tags input into a de-duped array of non-empty strings.
 * @param {any} input
 * @returns {string[]}
 */
function normalizeTags(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new HttpError(400, 'tags must be an array of strings.');

  const cleaned = [];
  const seen = new Set();

  for (const t of input) {
    if (typeof t !== 'string') throw new HttpError(400, 'tags must be an array of strings.');
    const tag = t.trim();
    if (!tag) continue;
    if (tag.length > 50) throw new HttpError(400, 'Tag names must be 50 characters or fewer.');
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(tag);
  }
  return cleaned;
}

module.exports = {
  HttpError,
  asyncHandler,
  parseId,
  validateCreateNote,
  validateUpdateNote,
  normalizeTags,
};
