import prisma from '../config/database.js';
import { auditLog } from '../utils/logger.js';
import mammoth from 'mammoth';


/**
 * Get all olympiads
 */
export const getAllOlympiads = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const olympiads = await prisma.olympiad.findMany({
      where: filter,
      include: {
        questions: { select: { duration: true } },
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate dynamic duration
    const processedOlympiads = olympiads.map(ol => {
      const totalDurationSecs = ol.questions.reduce((sum, q) => sum + (q.duration || 30), 0);
      const totalDurationMins = Math.ceil(totalDurationSecs / 60);
      
      // Remove questions array to keep response small
      const { questions, ...rest } = ol;
      return { ...rest, totalDuration: totalDurationMins };
    });

    res.json({ success: true, data: processedOlympiads });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single olympiad by ID
 */
export const getOlympiadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const olympiad = await prisma.olympiad.findUnique({
      where: { id },
      include: {
        questions: { select: { duration: true } },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!olympiad) {
      return res.status(404).json({ error: 'Olimpiada topilmadi' });
    }

    const totalDurationSecs = olympiad.questions.reduce((sum, q) => sum + (q.duration || 30), 0);
    const totalDurationMins = Math.ceil(totalDurationSecs / 60);
    
    const { questions, ...rest } = olympiad;
    const processedOlympiad = { ...rest, totalDuration: totalDurationMins };

    res.json({ success: true, data: processedOlympiad });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new olympiad (Admin only)
 */
export const createOlympiad = async (req, res, next) => {
  try {
    const { title, description, category, duration, icon } = req.body;

    const olympiad = await prisma.olympiad.create({
      data: {
        title,
        description,
        category,
        duration: parseInt(duration),
        icon
      }
    });

    // Audit Log
    await auditLog({
      userId: req.user.id,
      action: 'CREATE_OLYMPIAD',
      resourceType: 'Olympiad',
      resourceId: olympiad.id,
      details: { title },
      ip: req.ip
    });

    res.status(201).json({ success: true, data: olympiad });
  } catch (error) {
    next(error);
  }
};

/**
 * Update olympiad (Admin only)
 */
export const updateOlympiad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, duration, icon, status } = req.body;

    const olympiad = await prisma.olympiad.update({
      where: { id },
      data: {
        title,
        description,
        category,
        duration: parseInt(duration),
        icon,
        status
      }
    });

    // Audit Log
    await auditLog({
      userId: req.user.id,
      action: 'UPDATE_OLYMPIAD',
      resourceType: 'Olympiad',
      resourceId: id,
      details: { title, status },
      ip: req.ip
    });

    res.json({ success: true, data: olympiad });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete olympiad (Admin only)
 */
export const deleteOlympiad = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch before delete for logging
    const olympiad = await prisma.olympiad.findUnique({ where: { id } });

    await prisma.olympiad.delete({ where: { id } });

    // Audit Log
    await auditLog({
      userId: req.user.id,
      action: 'DELETE_OLYMPIAD',
      resourceType: 'Olympiad',
      resourceId: id,
      details: { title: olympiad?.title },
      ip: req.ip
    });

    res.json({ success: true, message: 'Olimpiada o\'chirildi' });
  } catch (error) {
    next(error);
  }
};

/**
 * Import Olympiad from Word file
 */
export const importOlympiad = async (req, res, next) => {
  try {
    const { title, description, defaultDuration } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Word fayl yuklanmadi' });
    }

    // 1. Extract text with mammoth
    const { value: text } = await mammoth.extractRawText({ buffer: file.buffer });
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Fayl bo\'sh yoki uni o\'qib bo\'lmadi' });
    }

    // 2. Parse questions (Multi-format support)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const questionsData = [];
    let currentQuestion = null;

    for (const line of lines) {
      // 3.1. Detect Question
      // Case A: Starts with "?" (e.g., ?Question text)
      // Case B: Starts with number (e.g., 1. Question text)
      // Case C: Ends with "?" and is long enough
      const qMatch = line.match(/^(\?|(\d+[\.\)\s]+))(.*)/);
      const isOption = line.startsWith('+') || line.startsWith('=') || line.match(/^[a-eA-E1-4][\.\)\s]/);

      if ((qMatch || (line.endsWith('?') && line.length > 10)) && !isOption) {
        if (currentQuestion && currentQuestion.options.length >= 2) {
          questionsData.push(currentQuestion);
        }
        
        currentQuestion = {
          text: qMatch ? qMatch[3].trim() : line.trim(),
          options: [],
          correctAnswer: 0,
          duration: parseInt(defaultDuration) || 30
        };
        continue;
      }

      // 3.2. Detect Options
      // Case A: Custom symbols (+ for correct, = for wrong)
      // Case B: Standard letters (A, B, C, D)
      if (currentQuestion) {
        const optMatch = line.match(/^([\+\=]|[a-eA-E1-4][\.\)\s]+)\s*(.*)/);
        
        if (optMatch) {
          const prefix = optMatch[1].trim();
          const optionText = optMatch[2].trim();
          
          if (optionText) {
            currentQuestion.options.push(optionText);
            // Mark as correct if prefix is '+' or 'A)'/ '1.' (default first option)
            if (prefix === '+' || (currentQuestion.options.length === 1 && !prefix.match(/^[\=\-]/))) {
              currentQuestion.correctAnswer = currentQuestion.options.length - 1;
            }
          }
        } else if (line.length > 0) {
          // If no prefix, append to question text or previous option
          if (currentQuestion.options.length === 0) {
            currentQuestion.text += ' ' + line;
          } else {
            currentQuestion.options[currentQuestion.options.length - 1] += ' ' + line;
          }
        }
      }
    }

    // Add last question
    if (currentQuestion && currentQuestion.options.length >= 2) {
      questionsData.push(currentQuestion);
    }

    if (questionsData.length === 0) {
      return res.status(400).json({ 
        error: 'Word fayl formati noto\'g\'ri yoki savollar topilmadi.',
        formatGuide: 'Format: Savol matni? keyingi qatorda + To\'g\'ri javob, keyingi qatorlarda = Noto\'g\'ri javob'
      });
    }

    // 3. Create Olympiad and Questions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const olympiad = await tx.olympiad.create({
        data: {
          title,
          description: description || null,
          category: 'Boshqa',
          duration: 60,
          status: 'active',
          questions: {
            create: questionsData
          }
        },
        include: {
          _count: { select: { questions: true } }
        }
      });

      return olympiad;
    });

    await auditLog({
      action: 'CREATE_OLYMPIAD_IMPORT',
      resourceType: 'Olympiad',
      resourceId: result.id,
      userId: req.user.id,
      ipAddress: req.ip
    });

    res.json({ 
      success: true, 
      message: `${questionsData.length} ta savol bilan olimpiada yaratildi`,
      data: result 
    });
  } catch (error) {
    next(error);
  }
};
