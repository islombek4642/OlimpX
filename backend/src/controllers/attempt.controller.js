import prisma from '../config/database.js';

/**
 * Get active attempt for an olympiad
 */
export const getActiveAttempt = async (req, res, next) => {
  try {
    const { olympiadId } = req.params;
    const userId = req.user.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: {
        userId_olympiadId: { userId, olympiadId }
      }
    });

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

/**
 * Save or update attempt progress
 */
export const saveAttempt = async (req, res, next) => {
  try {
    const { olympiadId, currentIdx, answers, timeLeft, totalTimeSpent, skippedIdxs } = req.body;
    const userId = req.user.id;

    const attempt = await prisma.quizAttempt.upsert({
      where: {
        userId_olympiadId: { userId, olympiadId }
      },
      update: {
        currentIdx,
        answers,
        timeLeft,
        totalTimeSpent,
        skippedIdxs,
        updatedAt: new Date()
      },
      create: {
        userId,
        olympiadId,
        currentIdx,
        answers,
        timeLeft,
        totalTimeSpent,
        skippedIdxs
      }
    });

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete attempt (when finished)
 */
export const deleteAttempt = async (req, res, next) => {
  try {
    const { olympiadId } = req.params;
    const userId = req.user.id;

    await prisma.quizAttempt.delete({
      where: {
        userId_olympiadId: { userId, olympiadId }
      }
    }).catch(() => {}); // Ignore if already deleted

    res.json({ success: true, message: 'Urinish tozalandi' });
  } catch (error) {
    next(error);
  }
};
