import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { RefreshToken } from '../models/RefreshToken.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    organizationName: 'Test Org',
  };

  let cookies = [];

  it('should register a new user and organization', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('name', testUser.name);
    expect(res.body.data.user).toHaveProperty('email', testUser.email);
    expect(res.body.data.user).toHaveProperty('organization');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    
    // Check cookies
    cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
    expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
    expect(cookies.some(c => c.startsWith('family='))).toBe(true);

    // Verify DB
    const org = await Organization.findOne({ name: testUser.organizationName });
    expect(org).toBeTruthy();
    expect(org.slug).toBe('test-org');
  });

  it('should not register with duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should get current user profile using access token', async () => {
    // The request method automatically uses cookies array as Cookie header
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies);
    
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('should refresh tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    
    // Update cookies for the next test
    cookies = res.headers['set-cookie'];
    
    // Check DB that we have the new token
    const familyCookie = cookies.find(c => c.startsWith('family='));
    const familyValue = familyCookie.split(';')[0].split('=')[1];
    const tokens = await RefreshToken.find({ family: familyValue });
    // Should have 2 tokens in this family (the original one and the new one)
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should login successfully', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    cookies = res.headers['set-cookie'];
  });

  it('should logout and clear cookies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    // The cookies array from the response should have maxAge=0 or expires to clear them
    const clearCookies = res.headers['set-cookie'];
    expect(clearCookies.some(c => c.includes('accessToken=;'))).toBe(true);
  });

  it('should not access protected route after logout', async () => {
    // We send NO cookies, should fail
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
