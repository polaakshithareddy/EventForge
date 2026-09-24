import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('GET /api/v1/health', () => {
  it('should return 200 with health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.mongodb).toBe('connected');
    expect(res.body.message).toBe('EventForge API is running');
  });

  it('should include uptime and timestamp', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should include environment info', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data.environment).toBeDefined();
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot find');
  });

  it('should return 404 for wrong HTTP methods', async () => {
    const res = await request(app).post('/api/v1/health');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Error handling', () => {
  it('should return JSON envelope on errors', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
  });
});
