/**
 * Database Backup Utility
 * Automated PostgreSQL backup with retention policy
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backup configuration
const BACKUP_DIR = path.join(process.cwd(), '..', '..', 'backups');
const RETENTION_DAYS = 7; // Keep backups for 7 days

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = async () => {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
};

/**
 * Generate backup filename with timestamp
 */
const generateBackupFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `olimpx_backup_${timestamp}.sql`;
};

/**
 * Parse DATABASE_URL to get connection details
 */
const parseDatabaseUrl = (url) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
};

/**
 * Create database backup
 */
export const createBackup = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  await ensureBackupDir();
  
  const dbConfig = parseDatabaseUrl(dbUrl);
  const filename = generateBackupFilename();
  const filepath = path.join(BACKUP_DIR, filename);

  // Build pg_dump command
  const pgDumpCmd = `pg_dump \
    --host=${dbConfig.host} \
    --port=${dbConfig.port} \
    --username=${dbConfig.user} \
    --dbname=${dbConfig.database} \
    --format=custom \
    --file="${filepath}" \
    --verbose`;

  try {
    // Set PGPASSWORD environment variable for authentication
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const { stdout, stderr } = await execAsync(pgDumpCmd, { env });
    
    if (stderr && !stderr.includes('pg_dump:')) {
      console.warn('Backup warnings:', stderr);
    }

    // Get file stats
    const stats = await fs.stat(filepath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup created: ${filename} (${sizeInMB} MB)`);
    
    return {
      success: true,
      filename,
      filepath,
      size: stats.size,
      sizeInMB,
      createdAt: new Date(),
    };
  } catch (error) {
    // Clean up failed backup file if it exists
    try {
      await fs.unlink(filepath);
    } catch {
      // File might not exist
    }
    
    throw new Error(`Backup failed: ${error.message}`);
  }
};

/**
 * List all backups
 */
export const listBackups = async () => {
  await ensureBackupDir();
  
  const files = await fs.readdir(BACKUP_DIR);
  const backups = [];

  for (const filename of files) {
    if (filename.endsWith('.sql')) {
      const filepath = path.join(BACKUP_DIR, filename);
      const stats = await fs.stat(filepath);
      
      backups.push({
        filename,
        filepath,
        size: stats.size,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
        createdAt: stats.mtime,
      });
    }
  }

  // Sort by date (newest first)
  return backups.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Restore database from backup
 */
export const restoreBackup = async (filename) => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const dbConfig = parseDatabaseUrl(dbUrl);
  const filepath = path.join(BACKUP_DIR, filename);

  // Check if backup file exists
  try {
    await fs.access(filepath);
  } catch {
    throw new Error(`Backup file not found: ${filename}`);
  }

  // Build pg_restore command
  const pgRestoreCmd = `pg_restore \
    --host=${dbConfig.host} \
    --port=${dbConfig.port} \
    --username=${dbConfig.user} \
    --dbname=${dbConfig.database} \
    --clean \
    --if-exists \
    --verbose \
    "${filepath}"`;

  try {
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const { stdout, stderr } = await execAsync(pgRestoreCmd, { env });
    
    if (stderr && !stderr.includes('pg_restore:')) {
      console.warn('Restore warnings:', stderr);
    }

    console.log(`✅ Database restored from: ${filename}`);
    
    return {
      success: true,
      filename,
      restoredAt: new Date(),
    };
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
};

/**
 * Clean up old backups based on retention policy
 */
export const cleanupOldBackups = async () => {
  const backups = await listBackups();
  const now = new Date();
  const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  
  for (const backup of backups) {
    const age = now - backup.createdAt;
    
    if (age > retentionMs) {
      try {
        await fs.unlink(backup.filepath);
        console.log(`🗑️ Deleted old backup: ${backup.filename}`);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete backup ${backup.filename}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Cleanup complete. Deleted ${deletedCount} old backups.`);
  
  return {
    success: true,
    deletedCount,
    remainingCount: backups.length - deletedCount,
  };
};

/**
 * Get backup statistics
 */
export const getBackupStats = async () => {
  const backups = await listBackups();
  
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const oldestBackup = backups.length > 0 ? backups[backups.length - 1].createdAt : null;
  const newestBackup = backups.length > 0 ? backups[0].createdAt : null;
  
  return {
    totalBackups: backups.length,
    totalSize,
    totalSizeInMB: (totalSize / (1024 * 1024)).toFixed(2),
    oldestBackup,
    newestBackup,
    retentionDays: RETENTION_DAYS,
    backupDirectory: BACKUP_DIR,
  };
};

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('🚀 Starting database backup...\n');
      
      // Create backup
      const backup = await createBackup();
      console.log('\n📊 Backup Details:');
      console.log(`   File: ${backup.filename}`);
      console.log(`   Size: ${backup.sizeInMB} MB`);
      console.log(`   Location: ${backup.filepath}`);
      
      // Cleanup old backups
      console.log('\n🧹 Cleaning up old backups...');
      await cleanupOldBackups();
      
      // Show stats
      const stats = await getBackupStats();
      console.log('\n📈 Backup Statistics:');
      console.log(`   Total backups: ${stats.totalBackups}`);
      console.log(`   Total size: ${stats.totalSizeInMB} MB`);
      console.log(`   Retention: ${stats.retentionDays} days`);
      
      console.log('\n✅ Backup process completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Backup failed:', error.message);
      process.exit(1);
    }
  })();
}

export default {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  getBackupStats,
};
