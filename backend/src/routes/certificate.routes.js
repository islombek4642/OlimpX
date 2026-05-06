/**
 * Certificate Generation Routes
 * Server-side PDF certificate generation
 */

import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { generateCertificatePDF } from '../services/pdf.service.js';
import prisma from '../config/database.js';

const router = Router();

/**
 * GET /api/certificates/:resultId
 * Generate and download certificate PDF
 */
router.get('/:resultId', auth, async (req, res, next) => {
  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    // Get result with olympiad details
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        olympiad: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Natija topilmadi',
      });
    }

    // Check ownership (only the user who took the quiz can get their certificate)
    if (result.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sertifikatni yuklashga ruxsat yo\'q',
      });
    }

    // Only generate certificate for scores >= 70%
    if (result.score < 70) {
      return res.status(403).json({
        success: false,
        error: 'Sertifikat faqat 70% dan yuqori natija uchun',
        score: result.score,
      });
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(result, result.user);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="OlimpX_Sertifikat_${result.user.fullName.replaceAll(/\s+/g, '_')}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/certificates/:resultId/preview
 * Preview certificate (returns JSON with certificate info)
 */
router.get('/:resultId/preview', auth, async (req, res, next) => {
  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        olympiad: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Natija topilmadi',
      });
    }

    // Check ownership
    if (result.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Ruxsat yo\'q',
      });
    }

    // Check if eligible for certificate
    const isEligible = result.score >= 70;

    res.json({
      success: true,
      data: {
        isEligible,
        score: result.score,
        olympiadTitle: result.olympiad?.title,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        skippedCount: result.skippedCount,
        timeTaken: result.timeTaken,
        createdAt: result.createdAt,
        certificateId: isEligible ? `OX-${Date.now().toString(36).toUpperCase()}` : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
