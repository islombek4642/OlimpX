import express from 'express';
import {
  getAllOlympiads,
  getOlympiadById,
  createOlympiad,
  updateOlympiad,
  deleteOlympiad,
  importOlympiad
} from '../controllers/olympiad.controller.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Olympiads
 *   description: Olympiad management endpoints
 */

/**
 * @swagger
 * /api/olympiads:
 *   get:
 *     summary: Get all olympiads
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: List of olympiads
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Olympiad'
 */
router.get('/', auth, getAllOlympiads);

/**
 * @swagger
 * /api/olympiads/{id}:
 *   get:
 *     summary: Get olympiad by ID
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Olympiad details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Olympiad'
 *       404:
 *         description: Olympiad not found
 */
router.get('/:id', auth, getOlympiadById);

/**
 * @swagger
 * /api/olympiads:
 *   post:
 *     summary: Create new olympiad (Admin only)
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               icon:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       201:
 *         description: Olympiad created
 */
router.post('/', auth, requireRole('admin'), validate('olympiad'), createOlympiad);

/**
 * @swagger
 * /api/olympiads/import:
 *   post:
 *     summary: Import olympiad from Word document (Admin only)
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Olympiad imported successfully
 */
router.post('/import', auth, requireRole('admin'), upload.single('file'), importOlympiad);

/**
 * @swagger
 * /api/olympiads/{id}:
 *   put:
 *     summary: Update olympiad (Admin only)
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Olympiad'
 *     responses:
 *       200:
 *         description: Olympiad updated
 */
router.put('/:id', auth, requireRole('admin'), validate('olympiad'), updateOlympiad);

/**
 * @swagger
 * /api/olympiads/{id}:
 *   delete:
 *     summary: Delete olympiad (Admin only)
 *     tags: [Olympiads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Olympiad deleted
 */
router.delete('/:id', auth, requireRole('admin'), deleteOlympiad);

export default router;
