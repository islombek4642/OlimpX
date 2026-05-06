import prisma from '../config/database.js';

/**
 * Get all questions (Admin only - for management)
 */
export const getAllQuestions = async (req, res, next) => {
  try {
    const { olympiadId } = req.query;
    const filter = {};
    if (olympiadId) filter.olympiadId = olympiadId;

    const questions = await prisma.question.findMany({
      where: filter,
      include: {
        olympiad: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questions for a specific olympiad (For Quiz)
 */
export const getQuestionsByOlympiad = async (req, res, next) => {
  try {
    const { olympiadId } = req.params;

    const questions = await prisma.question.findMany({
      where: { olympiadId },
      select: {
        id: true,
        text: true,
        options: true,
        duration: true,
        olympiadId: true
        // correctAnswer hidden for security
      }
    });

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify if an answer is correct
 */
export const verifyAnswer = async (req, res, next) => {
  try {
    const { questionId, selectedOption } = req.body;
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { correctAnswer: true }
    });

    if (!question) {
      return res.status(404).json({ error: 'Savol topilmadi' });
    }

    res.json({ 
      success: true, 
      isCorrect: question.correctAnswer === selectedOption,
      correctAnswer: question.correctAnswer
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Create new question (Admin only)
 */
export const createQuestion = async (req, res, next) => {
  try {
    const { olympiadId, text, options, correctAnswer, duration } = req.body;

    const question = await prisma.question.create({
      data: {
        olympiadId,
        text,
        options, // Array of strings expected
        correctAnswer: parseInt(correctAnswer),
        duration: duration ? parseInt(duration) : 30
      }
    });

    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

/**
 * Update question (Admin only)
 */
export const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { olympiadId, text, options, correctAnswer, duration } = req.body;

    const question = await prisma.question.update({
      where: { id },
      data: {
        olympiadId,
        text,
        options,
        correctAnswer: parseInt(correctAnswer),
        duration: duration ? parseInt(duration) : undefined
      }
    });

    res.json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Create questions (Admin only)
 */
export const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body; // Array of question objects

    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: 'Savollar massiv ko\'rinishida bo\'lishi kerak' });
    }

    // Prisma createMany is faster for large datasets
    const result = await prisma.question.createMany({
      data: questions.map(q => ({
        olympiadId: q.olympiadId,
        text: q.text,
        options: q.options,
        correctAnswer: parseInt(q.correctAnswer),
        duration: q.duration ? parseInt(q.duration) : 30
      }))
    });

    res.status(201).json({ 
      success: true, 
      message: `${result.count} ta savol muvaffaqiyatli yuklandi`,
      count: result.count 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete question (Admin only)
 */
export const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.question.delete({ where: { id } });
    res.json({ success: true, message: 'Savol o\'chirildi' });
  } catch (error) {
    next(error);
  }
};

