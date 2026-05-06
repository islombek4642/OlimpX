import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Olympiad Endpoints', () => {
  let adminToken;
  let userToken;

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
    // Create admin user (first user is admin from seed)
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send(adminUser);
    adminToken = adminRes.body.data.accessToken;

    // Create regular user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send(regularUser);
    userToken = userRes.body.data.accessToken;
  });

  describe('GET /api/olympiads', () => {
    it('should get all olympiads for authenticated user', async () => {
      const res = await request(app)
        .get('/api/olympiads')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/olympiads');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/olympiads', () => {
    it('should create olympiad for admin', async () => {
      const res = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testOlympiad);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe(testOlympiad.title);
    });

    it('should reject non-admin user', async () => {
      const res = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${userToken}`)
        .send(testOlympiad);

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test' }); // missing duration

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/olympiads/:id', () => {
    let olympiadId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testOlympiad);
      olympiadId = createRes.body.data.id;
    });

    it('should get olympiad by id', async () => {
      const res = await request(app)
        .get(`/api/olympiads/${olympiadId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(olympiadId);
    });

    it('should return 404 for non-existent olympiad', async () => {
      const res = await request(app)
        .get('/api/olympiads/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/olympiads/:id', () => {
    let olympiadId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testOlympiad);
      olympiadId = createRes.body.data.id;
    });

    it('should update olympiad for admin', async () => {
      const res = await request(app)
        .put(`/api/olympiads/${olympiadId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', duration: 45 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject update for non-admin', async () => {
      const res = await request(app)
        .put(`/api/olympiads/${olympiadId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/olympiads/:id', () => {
    let olympiadId;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/olympiads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testOlympiad);
      olympiadId = createRes.body.data.id;
    });

    it('should delete olympiad for admin', async () => {
      const res = await request(app)
        .delete(`/api/olympiads/${olympiadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject delete for non-admin', async () => {
      const res = await request(app)
        .delete(`/api/olympiads/${olympiadId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});
