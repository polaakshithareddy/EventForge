import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { Organization } from '../models/Organization.js';
import { Registration } from '../models/Registration.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Registrations, Tickets & QR Codes API', () => {
  let organizerCookies = [];
  let attendeeCookies = [];
  let attendee2Cookies = [];
  let testEvent = null;
  let freeRegistration = null;
  let paidRegistration = null;

  beforeAll(async () => {
    // 1. Create Organizer
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Conference Director',
      email: 'director@eventforge.test',
      password: 'Password123!',
      organizationName: 'Global Summits Ltd',
    });
    organizerCookies = orgRes.headers['set-cookie'];

    // 2. Create Attendees
    const attRes1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Attendee',
      email: 'alice@attendee.test',
      password: 'Password123!',
    });
    attendeeCookies = attRes1.headers['set-cookie'];

    const attRes2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Builder',
      email: 'bob@attendee.test',
      password: 'Password123!',
    });
    attendee2Cookies = attRes2.headers['set-cookie'];

    // 3. Create an Event with free and paid ticket tiers
    const startDate = new Date(Date.now() + 86400000 * 5).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 7).toISOString();

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Cookie', organizerCookies)
      .send({
        title: 'Cybersecurity Innovation Summit',
        type: 'conference',
        status: 'published',
        startDate,
        endDate,
        capacity: 100,
        isVirtual: true,
        ticketTypes: [
          { name: 'Standard Pass', price: 0, quantity: 50 },
          { name: 'VIP Executive', price: 299, quantity: 20 },
        ],
      });

    testEvent = eventRes.body.data.event;
  });

  describe('Event Registration & Payment Status', () => {
    it('should register for a free ticket with paymentStatus: "free" and generate QR code', async () => {
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', attendeeCookies)
        .send({
          eventId: testEvent._id,
          ticketTypeName: 'Standard Pass',
          notes: 'Looking forward to the zero-trust workshop',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      freeRegistration = res.body.data.registration;

      // User-approved change #1: Free ticket paymentStatus is 'free'
      expect(freeRegistration.paymentStatus).toBe('free');
      expect(freeRegistration.paidAt).toBeDefined();
      expect(freeRegistration.status).toBe('confirmed');

      // Valid ticket code & QR code
      expect(freeRegistration.ticketCode).toMatch(/^EF-/);
      expect(freeRegistration.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should prevent duplicate registration by the same attendee for the same event', async () => {
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', attendeeCookies)
        .send({
          eventId: testEvent._id,
          ticketTypeName: 'Standard Pass',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('should register for a paid ticket with paymentStatus: "unpaid"', async () => {
      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', attendee2Cookies)
        .send({
          eventId: testEvent._id,
          ticketTypeName: 'VIP Executive',
        });

      expect(res.status).toBe(201);
      paidRegistration = res.body.data.registration;

      // User-approved change #1: Paid ticket defaults to 'unpaid'
      expect(paidRegistration.paymentStatus).toBe('unpaid');
      expect(paidRegistration.paidAt).toBeFalsy();
      expect(paidRegistration.ticketType.price).toBe(299);
    });

    it('should list attendee registered events via /registrations/me', async () => {
      const res = await request(app)
        .get('/api/v1/registrations/me')
        .set('Cookie', attendeeCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.registrations.length).toBeGreaterThan(0);
      expect(res.body.data.registrations[0].event.title).toBe('Cybersecurity Innovation Summit');
    });
  });

  describe('Organizer Actions: Revenue Management & Check-in', () => {
    it('should list all event registrations and revenue summary for organizers', async () => {
      const res = await request(app)
        .get(`/api/v1/registrations/event/${testEvent._id}`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.registrations.length).toBe(2);
      expect(res.body.data.summary.total).toBe(2);
      expect(res.body.data.summary.free).toBe(1);
      expect(res.body.data.summary.unpaid).toBe(1);
    });

    it('should allow organizer to mark an unpaid registration as paid (User-approved change #1)', async () => {
      const res = await request(app)
        .patch(`/api/v1/registrations/${paidRegistration._id}/pay`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.registration.paymentStatus).toBe('paid');

      // Verify in DB
      const updated = await Registration.findById(paidRegistration._id);
      expect(updated.paymentStatus).toBe('paid');
      expect(updated.paidAt).toBeDefined();
    });

    it('should successfully check in an attendee using their ticket code', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/event/${testEvent._id}/checkin`)
        .set('Cookie', organizerCookies)
        .send({
          ticketCode: freeRegistration.ticketCode,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.registration.checkedIn).toBe(true);
      expect(res.body.data.registration.checkedInAt).toBeDefined();
    });

    it('should reject check-in if ticket is already checked in', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/event/${testEvent._id}/checkin`)
        .set('Cookie', organizerCookies)
        .send({
          ticketCode: freeRegistration.ticketCode,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already checked in/i);
    });

    it('should reject check-in with invalid ticket code', async () => {
      const res = await request(app)
        .post(`/api/v1/registrations/event/${testEvent._id}/checkin`)
        .set('Cookie', organizerCookies)
        .send({
          ticketCode: 'EF-INVALID-999',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Organization Subscription Attendee Limits', () => {
    it('should enforce Organization maxAttendees limit with 403 Forbidden (User-approved change #5)', async () => {
      // Set org maxAttendees limit to 2 (current registrations = 2)
      await Organization.findByIdAndUpdate(testEvent.organization, {
        'subscription.limits.maxAttendees': 2,
      });

      // Register a third attendee
      const attRes3 = await request(app).post('/api/v1/auth/register').send({
        name: 'Charlie Third',
        email: 'charlie@attendee.test',
        password: 'Password123!',
      });
      const attendee3Cookies = attRes3.headers['set-cookie'];

      const res = await request(app)
        .post('/api/v1/registrations')
        .set('Cookie', attendee3Cookies)
        .send({
          eventId: testEvent._id,
          ticketTypeName: 'Standard Pass',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/attendee limit reached/i);
    });
  });
});
