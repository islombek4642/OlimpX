/**
 * PDF Generation Service
 * Server-side certificate generation using PDFKit
 */

import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate certificate PDF
 */
export const generateCertificatePDF = async (result, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
      });

      const chunks = [];
      
      // Collect PDF data
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Background - Dark blue gradient effect
      doc.rect(0, 0, pageWidth, pageHeight)
        .fill('#0f172a');

      // Decorative corners
      doc.save();
      doc.fillColor('#1e293b');
      // Top left triangle
      doc.moveTo(0, 0).lineTo(150, 0).lineTo(0, 150).fill();
      // Bottom right triangle
      doc.moveTo(pageWidth, pageHeight).lineTo(pageWidth - 150, pageHeight).lineTo(pageWidth, pageHeight - 150).fill();
      doc.restore();

      // Gold border
      doc.save();
      doc.strokeColor('#d4af37').lineWidth(3);
      doc.rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();
      doc.strokeColor('#d4af37').lineWidth(1.5);
      doc.rect(25, 25, pageWidth - 50, pageHeight - 50).stroke();
      doc.restore();

      // Header - Platform name
      doc.save();
      doc.font('Times-Italic')
        .fontSize(22)
        .fillColor('#d4af37')
        .text("OlimpX Ta'lim Platformasi", pageWidth / 2, 50, { align: 'center' });
      doc.restore();

      // Title - SERTIFIKAT
      doc.save();
      doc.font('Helvetica-Bold')
        .fontSize(54)
        .fillColor('#ffffff')
        .text('SERTIFIKAT', pageWidth / 2, 90, { align: 'center', characterSpacing: 2 });
      doc.restore();

      // Subtitle
      doc.save();
      doc.font('Helvetica')
        .fontSize(16)
        .fillColor('#94a3b8')
        .text("Ushbu yutuq sertifikati munosib egaligini tasdiqlaydi:", pageWidth / 2, 150, { align: 'center' });
      doc.restore();

      // Recipient name
      doc.save();
      doc.font('Helvetica-Bold')
        .fontSize(36)
        .fillColor('#ffffff')
        .text(user.fullName.toUpperCase(), pageWidth / 2, 200, { align: 'center' });
      doc.restore();

      // Achievement description
      doc.save();
      doc.font('Helvetica-Oblique')
        .fontSize(16)
        .fillColor('#94a3b8')
        .text(`"${result.olympiad?.title || 'Olimpiada'}" olimpiadasidagi yuksak ishtiroki uchun.`, 
          pageWidth / 2, 260, { align: 'center' });
      doc.restore();

      // Score badge
      const badgeX = pageWidth / 2 - 50;
      const badgeY = 310;
      
      doc.save();
      doc.roundedRect(badgeX, badgeY, 100, 50, 10, 10).fill('#2563eb');
      doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#ffffff')
        .text(`${result.score}%`, pageWidth / 2, 330, { align: 'center' });
      doc.restore();

      // Score label
      doc.save();
      doc.font('Helvetica')
        .fontSize(12)
        .fillColor('#94a3b8')
        .text('OLIMPIADA NATIJASI', pageWidth / 2, 370, { align: 'center' });
      doc.restore();

      // Details section
      const detailsY = 420;
      doc.save();
      doc.font('Helvetica')
        .fontSize(14)
        .fillColor('#64748b');
      
      const details = [
        `To'g'ri javoblar: ${result.correctCount}`,
        `Noto'g'ri javoblar: ${result.incorrectCount || 0}`,
        `O'tkazib yuborilgan: ${result.skippedCount || 0}`,
        `Sarflangan vaqt: ${result.timeTaken}`,
        `O'rtacha vaqt: ${result.averageTime || 0}s`
      ];
      
      let currentY = detailsY;
      details.forEach(detail => {
        doc.text(detail, pageWidth / 2, currentY, { align: 'center' });
        currentY += 20;
      });
      doc.restore();

      // Approval seal (circle)
      const sealX = pageWidth - 120;
      const sealY = pageHeight - 120;
      
      doc.save();
      doc.circle(sealX, sealY, 40).strokeColor('#d4af37').lineWidth(2).stroke();
      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#d4af37')
        .text('TASDIQLANDI', sealX, sealY - 5, { align: 'center' });
      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('OlimpX Platformasi', sealX, sealY + 10, { align: 'center' });
      doc.restore();

      // Footer - Certificate ID and Date
      const certId = `OX-${Date.now().toString(36).toUpperCase()}`;
      const displayDate = result.createdAt 
        ? new Date(result.createdAt).toLocaleDateString('uz-UZ')
        : new Date().toLocaleDateString('uz-UZ');
      
      doc.save();
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#64748b')
        .text(`ID: ${certId}`, 60, pageHeight - 60);
      doc.text(`Sana: ${displayDate}`, pageWidth - 150, pageHeight - 60);
      doc.restore();

      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate certificate with custom styling
 */
export const generateCustomCertificate = async (data) => {
  const {
    recipientName,
    achievement,
    score,
    date,
    certificateId,
    issuer = "OlimpX Platformasi"
  } = data;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
      });

      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Elegant background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
      
      // Border
      doc.strokeColor('#1e40af').lineWidth(5);
      doc.rect(30, 30, pageWidth - 60, pageHeight - 60).stroke();
      doc.strokeColor('#3b82f6').lineWidth(2);
      doc.rect(40, 40, pageWidth - 80, pageHeight - 80).stroke();

      // Title
      doc.font('Helvetica-Bold').fontSize(48).fillColor('#1e40af');
      doc.text('SERTIFIKAT', pageWidth / 2, 80, { align: 'center' });

      // Content
      doc.font('Helvetica').fontSize(18).fillColor('#374151');
      doc.text('Bu sertifikat', pageWidth / 2, 150, { align: 'center' });
      
      doc.font('Helvetica-Bold').fontSize(32).fillColor('#1f2937');
      doc.text(recipientName.toUpperCase(), pageWidth / 2, 200, { align: 'center' });
      
      doc.font('Helvetica').fontSize(16).fillColor('#4b5563');
      doc.text(achievement, pageWidth / 2, 270, { align: 'center' });
      
      if (score) {
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#059669');
        doc.text(`Natija: ${score}%`, pageWidth / 2, 340, { align: 'center' });
      }

      // Footer
      doc.font('Helvetica').fontSize(12).fillColor('#6b7280');
      doc.text(`ID: ${certificateId}`, 60, pageHeight - 80);
      doc.text(`Sana: ${date}`, pageWidth - 200, pageHeight - 80);
      doc.text(issuer, pageWidth / 2, pageHeight - 80, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  generateCertificatePDF,
  generateCustomCertificate,
};
