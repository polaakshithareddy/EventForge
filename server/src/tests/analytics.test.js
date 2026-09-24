import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Analytics, Reports & Exports API (Phase 6)', () => {
  let organizerCookies = [];
  let attendeeCookies = [];
  let testEvent = null;
  let reg1 = null;
  let reg2 = null;

  beforeAll(async () => {
    // 1. Create Organizer
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Analytics Director',
      email: 'director.analytics@eventforge.test',
      password: 'Password123!',
      organizationName: 'DataCorp Summits',
    });
    organizerCookies = orgRes.headers['set-cookie'];

    // 2. Create Regular Attendee
    const attRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Data Attendee',
      email: 'attendee.analytics@eventforge.test',
      password: 'Password123!',
    });
    attendeeCookies = attRes.headers['set-cookie'];

    // 3. Create Event with Paid & Free ticket tiers
    const startDate = new Date(Date.now() + 86400000 * 15).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 18).toISOString();

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Cookie', organizerCookies)
      .send({
        title: 'Global Big Data & Analytics Conference',
        type: 'conference',
        status: 'published',
        startDate,
        endDate,
        capacity: 200,
        isVirtual: false,
        ticketTypes: [
          { name: 'Standard Pass', price: 0, quantity: 150 },
          { name: 'Executive VIP', price: 500, quantity: 50 },
        ],
      });

    testEvent = eventRes.body.data.event;

    // 4. Create Registrations
    // Free registration
    const r1 = await request(app)
      .post('/api/v1/registrations')
      .set('Cookie', attendeeCookies)
      .send({
        eventId: testEvent._id,
        ticketTypeName: 'Standard Pass',
        notes: 'Interested in AI pipelines',
      });
    reg1 = r1.body.data.registration;

    // Paid registration
    const r2 = await request(app)
      .post('/api/v1/registrations')
      .set('Cookie', organizerCookies)
      .send({
        eventId: testEvent._id,
        ticketTypeName: 'Executive VIP',
      });
    reg2 = r2.body.data.registration;

    // Mark paid registration as PAID
    await request(app)
      .patch(`/api/v1/registrations/${reg2._id}/pay`)
      .set('Cookie', organizerCookies);

    // Check in registration 1
    await request(app)
      .post(`/api/v1/registrations/event/${testEvent._id}/checkin`)
      .set('Cookie', organizerCookies)
      .send({ ticketCode: reg1.ticketCode });
  });

  describe('Event Overview Analytics', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get(
        `/api/v1/analytics/event/${testEvent._id}/overview`
      );
      expect(res.status).toBe(401);
    });

    it('should reject unauthorized attendee with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/event/${testEvent._id}/overview`)
        .set('Cookie', attendeeCookies);

      expect(res.status).toBe(403);
    });

    it('should return aggregated metrics, revenue, and check-in rate for organizer', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/event/${testEvent._id}/overview`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { metrics, tierBreakdown, checkinTimeline } = res.body.data;

      // 2 registrations created
      expect(metrics.totalRegistrations).toBe(2);
      expect(metrics.confirmedRegistrations).toBe(2);
      expect(metrics.checkedInCount).toBe(1);
      expect(metrics.checkinRate).toBe(50); // 1 / 2 = 50%
      expect(metrics.capacityUtilization).toBe(1); // 2 / 200 = 1%
      expect(metrics.totalRevenue).toBe(500); // 1 VIP pass at $500 marked as paid

      // Payment Breakdown
      expect(metrics.paymentBreakdown.paid).toBe(1);
      expect(metrics.paymentBreakdown.free).toBe(1);
      expect(metrics.paymentBreakdown.unpaid).toBe(0);

      // Tier Breakdown
      expect(tierBreakdown.length).toBe(2);
      const vipTier = tierBreakdown.find((t) => t.tierName === 'Executive VIP');
      expect(vipTier).toBeTruthy();
      expect(vipTier.revenue).toBe(500);

      // Check-in timeline
      expect(checkinTimeline.length).toBeGreaterThan(0);
      expect(checkinTimeline[0].count).toBe(1);
    });
  });

  describe('CSV Attendee Roster Export', () => {
    it('should stream RFC-compliant CSV with attendee details and proper headers', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/event/${testEvent._id}/export/attendees`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*-attendees\.csv/);

      const csvLines = res.text.split('\r\n');
      expect(csvLines.length).toBeGreaterThanOrEqual(3); // header + 2 registrations

      const headerLine = csvLines[0];
      expect(headerLine).toContain('Attendee Name');
      expect(headerLine).toContain('Ticket Code');
      expect(headerLine).toContain('Payment Status');
      expect(headerLine).toContain('Checked In');

      expect(res.text).toContain('attendee.analytics@eventforge.test');
      expect(res.text).toContain('Standard Pass');
      expect(res.text).toContain('Executive VIP');
      expect(res.text).toContain('PAID');
      expect(res.text).toContain('FREE');
    });
  });

  describe('Attendee Badge Sheet Generation', () => {
    it('should return printable badge records with QR codes and attendee credentials', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/event/${testEvent._id}/badges`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalBadges).toBe(2);

      const badges = res.body.data.badges;
      expect(badges.length).toBe(2);
      expect(badges[0].ticketCode).toBeTruthy();
      expect(badges[0].qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(badges[0].ticketTier).toBeTruthy();
    });
  });
});
