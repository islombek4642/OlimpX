import express from 'express';
import { getActiveAttempt, saveAttempt, deleteAttempt } from '../controllers/attempt.controller.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:olympiadId', auth, getActiveAttempt);
router.post('/save', auth, saveAttempt);
router.delete('/:olympiadId', auth, deleteAttempt);

export default router;
