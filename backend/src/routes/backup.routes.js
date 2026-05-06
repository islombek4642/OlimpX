/**
 * Backup Management Routes
 * Admin-only endpoints for database backup operations
 */

import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { auditLog } from '../utils/logger.js';
import {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  getBackupStats,
} from '../utils/backup.js';

const router = Router();

// All routes require admin role
router.use(auth);
router.use(requireRole('admin'));

/**
 * GET /api/backups
 * List all backups
 */
router.get('/', async (req, res, next) => {
  try {
    const backups = await listBackups();
    const stats = await getBackupStats();
    
    res.json({
      success: true,
      data: {
        backups,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/backups/stats
 * Get backup statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getBackupStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/backups
 * Create new backup
 */
router.post('/', async (req, res, next) => {
  try {
    const backup = await createBackup();
    
    // Audit log
    await auditLog({
      userId: req.user.id,
      action: 'BACKUP_CREATE',
      resourceType: 'backup',
      resourceId: backup.filename,
      details: { size: backup.sizeInMB },
      ipAddress: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      data: backup,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/backups/restore
 * Restore database from backup
 */
router.post('/restore', async (req, res, next) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required',
      });
    }
    
    const result = await restoreBackup(filename);
    
    // Audit log
    await auditLog({
      userId: req.user.id,
      action: 'BACKUP_RESTORE',
      resourceType: 'backup',
      resourceId: filename,
      ipAddress: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Database restored successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/backups/cleanup
 * Clean up old backups
 */
router.post('/cleanup', async (req, res, next) => {
  try {
    const result = await cleanupOldBackups();
    
    // Audit log
    await auditLog({
      userId: req.user.id,
      action: 'BACKUP_CLEANUP',
      resourceType: 'backup',
      details: { deletedCount: result.deletedCount },
      ipAddress: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Old backups cleaned up successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/backups/:filename
 * Delete specific backup
 */
router.delete('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const BACKUP_DIR = path.join(process.cwd(), '..', '..', 'backups');
    const filepath = path.join(BACKUP_DIR, filename);
    
    // Security check - ensure file is within backup directory
    if (!filepath.startsWith(BACKUP_DIR)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid filename',
      });
    }
    
    await fs.unlink(filepath);
    
    // Audit log
    await auditLog({
      userId: req.user.id,
      action: 'BACKUP_DELETE',
      resourceType: 'backup',
      resourceId: filename,
      ipAddress: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found',
      });
    }
    next(error);
  }
});

export default router;
