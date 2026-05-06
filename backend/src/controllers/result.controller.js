import prisma from '../config/database.js';
import { auditLog } from '../utils/logger.js';
import { getPagination, formatPaginatedResponse } from '../utils/helpers.js';

/**
 * Submit quiz result
 */
/**
 * Validate timeTaken format and reasonableness
 * Returns { isValid, error, totalSeconds }
 */
const validateTimeTaken = (timeTaken, olympiad, questions) => {
  // Format validation: must be MM:SS
  const timeRegex = /^(\d{1,3}):([0-5]\d)$/;
  if (!timeRegex.test(timeTaken)) {
    return { isValid: false, error: 'Vaqt formati noto\'g\'ri (MM:SS)' };
  }

  const [mins, secs] = timeTaken.split(':').map(Number);
  const totalSeconds = (mins * 60) + secs;

  // Negative time check
  if (totalSeconds < 0) {
    return { isValid: false, error: 'Vaqt manfiy bo\'lishi mumkin emas' };
  }

  // Calculate minimum possible time (at least 3 seconds per question answered)
  const minPossibleTime = questions.length * 3;

  // Calculate maximum allowed time:
  // Sum of all question durations + 5 minute buffer
  const maxQuestionTime = questions.reduce((sum, q) => sum + (q.duration || 30), 0);
  const maxAllowedTime = maxQuestionTime + (5 * 60); // 5 minute buffer

  // Check if too fast (bot suspicion)
  if (totalSeconds < minPossibleTime) {
    return {
      isValid: false,
      error: `Juda tez bajarildi (${totalSeconds}s). Kamida ${minPossibleTime}s kuting.`,
      totalSeconds
    };
  }

  // Check if too slow (possible manipulation)
  if (totalSeconds > maxAllowedTime) {
    return {
      isValid: false,
      error: `Vaqt limitdan oshdi (${totalSeconds}s > ${maxAllowedTime}s)`,
      totalSeconds
    };
  }

  return { isValid: true, totalSeconds };
};

export const submitResult = async (req, res, next) => {
  try {
    const { olympiadId, answers, timeTaken } = req.body;
    const userId = req.user.id;

    // 1. Fetch the olympiad and its questions to verify answers
    const olympiad = await prisma.olympiad.findUnique({
      where: { id: olympiadId },
      include: { questions: { orderBy: { createdAt: 'asc' } } } // Ensure order matches
    });

    if (!olympiad) {
      return res.status(404).json({ error: 'Olimpiada topilmadi' });
    }

    // SERVER-SIDE TIME VALIDATION
    const timeValidation = validateTimeTaken(timeTaken, olympiad, olympiad.questions);
    if (!timeValidation.isValid) {
      return res.status(400).json({
        error: 'Vaqt validatsiyasi xato',
        message: timeValidation.error
      });
    }

    const questions = olympiad.questions;
    const totalQuestions = questions.length;
    
    let correctCount = 0;
    let skippedCount = 0;
    let incorrectCount = 0;

    const details = questions.map((q, i) => {
      const userAnsIndex = answers[i];
      const isCorrect = userAnsIndex === q.correctAnswer;
      const isSkipped = userAnsIndex === null || userAnsIndex === undefined;

      if (isSkipped) {
        skippedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      return {
        questionText: q.text,
        userAnswerText: isSkipped ? 'Belgilanmagan' : q.options[userAnsIndex],
        correctAnswerText: q.options[q.correctAnswer],
        isCorrect,
        isSkipped
      };
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Parse timeTaken "MM:SS" to seconds
    const [mins, secs] = timeTaken.split(':').map(Number);
    const totalSeconds = (mins * 60) + secs;
    
    // Average time per answered question
    const answeredCount = correctCount + incorrectCount;
    const averageTime = answeredCount > 0 ? Math.round(totalSeconds / answeredCount) : 0;

    // 2. Save the result
    const result = await prisma.result.create({
      data: {
        userId,
        olympiadId,
        score,
        correctCount,
        incorrectCount,
        skippedCount,
        totalQuestions,
        timeTaken,
        averageTime,
        details // JSON object with question answers
      }
    });

    // Audit Log for activity tracking
    await auditLog({
      userId,
      action: 'SUBMIT_TEST',
      resourceType: 'Olympiad',
      resourceId: olympiadId,
      details: { score, correctCount, totalQuestions, title: olympiad.title },
      ip: req.ip
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Submit Result Error:', error);
    next(error);
  }
};

/**
 * Get user's own results with pagination
 */
export const getMyResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    // Get total count
    const total = await prisma.result.count({ where: { userId } });
    const pagination = getPagination(page, limit, total);

    const results = await prisma.result.findMany({
      where: { userId },
      include: {
        olympiad: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit
    });

    res.json({ 
      success: true, 
      ...formatPaginatedResponse(results, pagination)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all results with pagination (Admin only)
 */
export const getAllResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, olympiadId, userId } = req.query;

    // Build where clause for filtering
    const where = {};
    if (olympiadId) where.olympiadId = olympiadId;
    if (userId) where.userId = userId;

    // Get total count
    const total = await prisma.result.count({ where });
    const pagination = getPagination(page, limit, total);

    const results = await prisma.result.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        olympiad: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit
    });

    res.json({ 
      success: true, 
      ...formatPaginatedResponse(results, pagination)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single result by ID
 */
export const getResultById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await prisma.result.findUnique({
      where: { id },
      include: {
        olympiad: { select: { title: true } },
        user: { select: { fullName: true, email: true } }
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Natija topilmadi' });
    }

    // Check ownership or admin role
    if (result.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete result (Admin only)
 */
export const deleteResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.result.delete({ where: { id } });
    res.json({ success: true, message: 'Natija o\'chirildi' });
  } catch (error) {
    next(error);
  }
};


