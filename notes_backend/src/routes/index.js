'use strict';

const express = require('express');
const healthController = require('../controllers/health');
const notesController = require('../controllers/notes');
const tagsController = require('../controllers/tags');
const favoritesController = require('../controllers/favorites');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Title is required.
 *         details:
 *           description: Optional additional error details
 *     Note:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Grocery list
 *         content:
 *           type: string
 *           example: Milk, eggs, bread
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         favorite:
 *           type: boolean
 *           example: false
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: [personal, errands]
 *     NoteCreateRequest:
 *       type: object
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *           example: My note
 *         content:
 *           type: string
 *           example: Some content
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: [work]
 *         favorite:
 *           type: boolean
 *           example: true
 *     NoteUpdateRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         favorite:
 *           type: boolean
 *     Tag:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: work
 *         noteCount:
 *           type: integer
 *           example: 3
 */

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

/**
 * @swagger
 * /notes:
 *   get:
 *     tags: [Notes]
 *     summary: List notes
 *     description: Returns all notes ordered by most recently updated.
 *     responses:
 *       200:
 *         description: Notes list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 *   post:
 *     tags: [Notes]
 *     summary: Create note
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteCreateRequest'
 *     responses:
 *       201:
 *         description: Created note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/notes', asyncHandler(notesController.list.bind(notesController)));
router.post('/notes', asyncHandler(notesController.create.bind(notesController)));

/**
 * @swagger
 * /notes/search:
 *   get:
 *     tags: [Notes]
 *     summary: Search notes
 *     description: Search notes by query string in title or content.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Query string
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 */
router.get('/notes/search', asyncHandler(notesController.search.bind(notesController)));

/**
 * @swagger
 * /notes/{id}:
 *   get:
 *     tags: [Notes]
 *     summary: Get note by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *   put:
 *     tags: [Notes]
 *     summary: Update note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NoteUpdateRequest'
 *     responses:
 *       200:
 *         description: Updated note
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *   delete:
 *     tags: [Notes]
 *     summary: Delete note
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/notes/:id', asyncHandler(notesController.getById.bind(notesController)));
router.put('/notes/:id', asyncHandler(notesController.update.bind(notesController)));
router.delete('/notes/:id', asyncHandler(notesController.remove.bind(notesController)));

/**
 * @swagger
 * /tags:
 *   get:
 *     tags: [Tags]
 *     summary: List tags
 *     description: Returns tags with note counts.
 *     responses:
 *       200:
 *         description: Tags list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 */
router.get('/tags', asyncHandler(tagsController.list.bind(tagsController)));

/**
 * @swagger
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: List favorite notes
 *     responses:
 *       200:
 *         description: Favorite notes list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Note'
 */
router.get('/favorites', asyncHandler(favoritesController.list.bind(favoritesController)));

module.exports = router;
