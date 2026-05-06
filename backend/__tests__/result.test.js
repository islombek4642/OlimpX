import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Result Endpoints', () => {
  let adminToken;
  let userToken;
  let olympiadId;

  const adminUser = {
    fullName: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin123!'
  };

  const regularUser = {
    fullName: 'Regular User',
    email: 'user@test.com',
    password: 'User123!'
  };

  const testOlympiad = {
    title: 'Test Olympiad',
    description: 'Test Description',
    category: 'Test',
    duration: 30,
    status: 'active'
  };

  beforeEach(async () => {
    // Create admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.data.accessToken;

    // Create regular user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send(regularUser);
    userToken = userRes.body.data.accessToken;

    // Create olympiad with questions
    const olympiadRes = await request(app)
      .post('/api/olympiads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testOlympiad);
    olympiadId = olympiadRes.body.data.id;

    // Add questions to olympiad
    await request(app)
      .post('/api/questions/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        olympiadId,
        questions: [
          { text: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0, duration: 30 },
          { text: 'Q2', options: ['A', 'B', 'C', 'D'], correctAnswer: 1, duration: 30 }
        ]
      });
  });

  describe('POST /api/results/submit', () => {
    it('should submit quiz result successfully', async () => {
      const res = await request(app)
        .post('/api/results/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          olympiadId,
          answers: [0, 1],
          timeTaken: '01:30'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('score');
      expect(res.body.data).toHaveProperty('correctCount');
    });

    it('should reject invalid time format', async () => {
      const res = await request(app)
        .post('/api/results/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          olympiadId,
          answers: [0, 1],
          timeTaken: 'invalid'
        });

      expect(res.status).toBe(400);
    });

    it('should reject too fast submissions (bot detection)', async () => {
      const res = await request(app)
        .post('/api/results/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          olympiadId,
          answers: [0, 1],
          timeTaken: '00:03'  // Too fast
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/results/my', () => {
    it('should get current user results', async () => {
      // Submit a result first
      await request(app)
        .post('/api/results/submit')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          olympiadId,
          answers: [0, 1],
          timeTaken: '01:30'
        });

      const res = await request(app)
        .get('/api/results/my')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/results/all', () => {
    it('should get all results for admin', async () => {
      const res = await request(app)
        .get('/api/results/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/results/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});
