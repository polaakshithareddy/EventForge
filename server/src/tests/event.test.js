import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Organization } from '../models/Organization.js';
import { Event } from '../models/Event.js';
import { EventMembership } from '../models/EventMembership.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Events and Venues API', () => {
  let authCookies = [];
  let testVenueId = null;
  let createdEvent = null;

  beforeAll(async () => {
    // Register organizer user
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Organizer User',
      email: 'organizer@eventforge.test',
      password: 'Password123!',
      organizationName: 'Forge Corp',
    });
    authCookies = res.headers['set-cookie'];
  });

  describe('Venue CRUD', () => {
    it('should create a venue for the organization', async () => {
      const res = await request(app)
        .post('/api/v1/venues')
        .set('Cookie', authCookies)
        .send({
          name: 'Grand Horizon Convention Center',
          description: 'Premier downtown venue',
          address: {
            street: '100 Main St',
            city: 'San Francisco',
            state: 'CA',
            country: 'USA',
            postalCode: '94105',
          },
          capacity: 1000,
          amenities: ['WiFi', 'Projector', 'Catering Kitchen'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.venue).toHaveProperty('_id');
      expect(res.body.data.venue.name).toBe('Grand Horizon Convention Center');
      testVenueId = res.body.data.venue._id;
    });

    it('should list venues scoped to organization', async () => {
      const res = await request(app)
        .get('/api/v1/venues')
        .set('Cookie', authCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.venues.length).toBeGreaterThan(0);
      expect(res.body.data.venues[0].name).toBe('Grand Horizon Convention Center');
    });

    it('should get venue by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/venues/${testVenueId}`)
        .set('Cookie', authCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.venue._id).toBe(testVenueId);
    });
  });

  describe('Event Creation & Organization Limits', () => {
    it('should create an event and assign creator as organizer membership', async () => {
      const startDate = new Date(Date.now() + 86400000 * 10).toISOString(); // 10 days ahead
      const endDate = new Date(Date.now() + 86400000 * 12).toISOString(); // 12 days ahead

      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', authCookies)
        .send({
          title: 'TechForge 2026 Summit',
          description: 'Annual corporate tech & AI conference',
          type: 'conference',
          status: 'published',
          startDate,
          endDate,
          venue: testVenueId,
          capacity: 500,
          isPublic: true,
          ticketTypes: [
            { name: 'General Admission', price: 199, quantity: 400 },
            { name: 'VIP Pass', price: 499, quantity: 100 },
          ],
          tags: ['AI', 'Tech', 'Cloud'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdEvent = res.body.data.event;
      expect(createdEvent.slug).toBe('techforge-2026-summit');
      expect(createdEvent.venue._id).toBe(testVenueId);

      // Verify creator was granted EventMembership with role 'organizer' (User-approved change #3)
      const membership = await EventMembership.findOne({
        event: createdEvent._id,
        role: 'organizer',
      });
      expect(membership).toBeTruthy();
    });

    it('should prevent venue double-booking during overlapping UTC time window', async () => {
      // Conflicting overlapping window
      const overlapStart = new Date(new Date(createdEvent.startDate).getTime() + 3600000).toISOString();
      const overlapEnd = new Date(new Date(createdEvent.endDate).getTime() + 3600000).toISOString();

      // Temporarily bump maxEvents limit to test conflict logic specifically
      await Organization.findByIdAndUpdate(createdEvent.organization, {
        'subscription.limits.maxEvents': 10,
      });

      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', authCookies)
        .send({
          title: 'Conflicting Summit',
          type: 'conference',
          startDate: overlapStart,
          endDate: overlapEnd,
          venue: testVenueId,
          capacity: 200,
        });

      // User-approved change #6: UTC venue conflict detection returns 409
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Venue conflict/i);
    });

    it('should enforce Organization maxEvents subscription limit with 403', async () => {
      // Set org maxEvents limit to 1 (which matches current count of 1)
      await Organization.findByIdAndUpdate(createdEvent.organization, {
        'subscription.limits.maxEvents': 1,
      });

      const futureStart = new Date(Date.now() + 86400000 * 30).toISOString();
      const futureEnd = new Date(Date.now() + 86400000 * 32).toISOString();

      const res = await request(app)
        .post('/api/v1/events')
        .set('Cookie', authCookies)
        .send({
          title: 'Second Event Exceeding Limit',
          type: 'workshop',
          startDate: futureStart,
          endDate: futureEnd,
          capacity: 100,
          isVirtual: true,
        });

      // User-approved change #5: Organization subscription limit enforcement
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Organization event limit reached/i);
    });
  });

  describe('Public Event Discovery (No Auth Required)', () => {
    it('should list published public events for anonymous visitors', async () => {
      const res = await request(app).get('/api/v1/events/public');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThan(0);
      const found = res.body.data.events.find((e) => e.slug === 'techforge-2026-summit');
      expect(found).toBeTruthy();
      expect(found.title).toBe('TechForge 2026 Summit');
    });

    it('should get public event details by slug', async () => {
      const res = await request(app).get(`/api/v1/events/public/${createdEvent.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.data.event.title).toBe('TechForge 2026 Summit');
      expect(res.body.data.event.venue.name).toBe('Grand Horizon Convention Center');
    });
  });

  describe('Session Management & Invites', () => {
    it('should allow organizer to add a session to the event', async () => {
      const sessionStart = new Date(new Date(createdEvent.startDate).getTime() + 3600000).toISOString();
      const sessionEnd = new Date(new Date(createdEvent.startDate).getTime() + 7200000).toISOString();

      const res = await request(app)
        .post(`/api/v1/events/${createdEvent._id}/sessions`)
        .set('Cookie', authCookies)
        .send({
          title: 'Opening Keynote: Next-Gen Agentic Architecture',
          description: 'Exploring LLMs in enterprise event workflows',
          startTime: sessionStart,
          endTime: sessionEnd,
          room: 'Grand Ballroom A',
          capacity: 400,
          tags: ['Keynote', 'AI'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.session.title).toBe('Opening Keynote: Next-Gen Agentic Architecture');
    });

    it('should invite a speaker/staff by email (User-approved change #4)', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${createdEvent._id}/members`)
        .set('Cookie', authCookies)
        .send({
          email: 'keynote.speaker@external.com',
          role: 'speaker',
          name: 'Dr. Jane Smith',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.member.role).toBe('speaker');
      expect(res.body.data.member.user.email).toBe('keynote.speaker@external.com');

      // Verify membership exists in DB
      const memberRecord = await EventMembership.findOne({
        event: createdEvent._id,
        role: 'speaker',
      });
      expect(memberRecord).toBeTruthy();
    });
  });
});
