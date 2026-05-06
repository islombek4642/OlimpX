import prisma from '../config/database.js';

/**
 * Log a system action to the database
 * @param {object} params
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Action name (e.g., CREATE_OLYMPIAD)
 * @param {string} params.resourceType - Type of resource affected
 * @param {string} params.resourceId - ID of the resource affected
 * @param {object} params.details - Additional JSON details
 * @param {string} params.ip - IP address of the user
 */
export const auditLog = async ({ userId, action, resourceType, resourceId, details, ip }) => {
  try {
    const cleanIp = ip && ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: cleanIp
      }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
    // We don't throw here to avoid breaking the main business flow
  }
};
