import express from 'express';
import {
  getAllQuestions,
  getQuestionsByOlympiad,
  verifyAnswer,
  createQuestion,
  bulkCreateQuestions,
  updateQuestion,
  deleteQuestion
} from '../controllers/question.controller.js';

import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Question management endpoints
 */

/**
 * @swagger
 * /api/questions/olympiad/{olympiadId}:
 *   get:
 *     summary: Get questions by olympiad (without correct answers)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: olympiadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of questions (correctAnswer excluded)
 */
router.get('/olympiad/:olympiadId', auth, getQuestionsByOlympiad);

/**
 * @swagger
 * /api/questions/verify:
 *   post:
 *     summary: Verify answer for a question (server-side check)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               selectedOption:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Answer verification result
 */
router.post('/verify', auth, verifyAnswer);

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Get all questions with correct answers (Admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all questions
 */
router.get('/', auth, requireRole('admin'), getAllQuestions);

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Create new question (Admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olympiadId:
 *                 type: string
 *               text:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: integer
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/', auth, requireRole('admin'), validate('question'), createQuestion);

/**
 * @swagger
 * /api/questions/bulk:
 *   post:
 *     summary: Bulk create questions (Admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olympiadId:
 *                 type: string
 *               questions:
 *                 type: array
 *     responses:
 *       201:
 *         description: Questions created
 */
router.post('/bulk', auth, requireRole('admin'), validate('bulkQuestions'), bulkCreateQuestions);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Update question (Admin only)
 *     tags: [Questions]
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
 *         description: Question updated
 */
router.put('/:id', auth, requireRole('admin'), validate('question'), updateQuestion);

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     summary: Delete question (Admin only)
 *     tags: [Questions]
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
 *         description: Question deleted
 */
router.delete('/:id', auth, requireRole('admin'), deleteQuestion);

export default router;
