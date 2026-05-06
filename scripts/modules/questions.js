/**
 * ============================================
 * OlimpX - Questions Repository
 * Now fetching data from the Backend API
 * ============================================
 */

import { api } from './api.js';

/**
 * Fetch all olympiads from API
 */
export async function getOlympiads() {
  try {
    const result = await api.olympiads.getAll('active');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('getOlympiads failed:', error);
    return [];
  }
}

/**
 * Fetch single olympiad by ID
 */
export async function getOlympiadById(id) {
  try {
    const result = await api.olympiads.getById(id);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('getOlympiadById failed:', error);
    return null;
  }
}

/**
 * Fetch questions for a specific olympiad
 */
export async function getQuestionsByOlympiadId(id) {
  try {
    const result = await api.questions.getByOlympiad(id);
    return result.success ? result.data : [];
  } catch (error) {
    console.error('getQuestionsByOlympiadId failed:', error);
    return [];
  }
}

/**
 * Get random olympiad from the list
 */
export async function getRandomOlympiad() {
  const olympiads = await getOlympiads();
  if (olympiads.length === 0) return null;
  return olympiads[Math.floor(Math.random() * olympiads.length)];
}

/**
 * For Admin: Fetch all questions
 */
export async function getAllQuestions() {
  try {
    const result = await api.questions.getAll();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('getAllQuestions failed:', error);
    return [];
  }
}
