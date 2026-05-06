import express from 'express';
import {
  submitResult,
  getMyResults,
  getResultById,
  getAllResults,
  deleteResult
} from '../controllers/result.controller.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Results
 *   description: Quiz results management
 */

/**
 * @swagger
 * /api/results/all:
 *   get:
 *     summary: Get all results (Admin only)
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: olympiadId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated results list
 */
router.get('/all', auth, requireRole('admin'), getAllResults);

/**
 * @swagger
 * /api/results/submit:
 *   post:
 *     summary: Submit quiz result
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - olympiadId
 *               - answers
 *               - timeTaken
 *             properties:
 *               olympiadId:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: integer
 *               timeTaken:
 *                 type: string
 *                 example: "15:30"
 *     responses:
 *       201:
 *         description: Result submitted successfully
 *       400:
 *         description: Time validation error
 */
router.post('/submit', auth, validate('resultSubmit'), submitResult);

/**
 * @swagger
 * /api/results/my:
 *   get:
 *     summary: Get current user's results
 *     tags: [Results]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's results list
 */
router.get('/my', auth, getMyResults);

/**
 * @swagger
 * /api/results/{id}:
 *   get:
 *     summary: Get result by ID
 *     tags: [Results]
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
 *         description: Result details
 *       403:
 *         description: Access denied
 */
router.get('/:id', auth, getResultById);

/**
 * @swagger
 * /api/results/{id}:
 *   delete:
 *     summary: Delete result (Admin only)
 *     tags: [Results]
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
 *         description: Result deleted
 */
router.delete('/:id', auth, requireRole('admin'), deleteResult);

export default router;
