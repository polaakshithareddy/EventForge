import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
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

describe('Sponsors & Exhibitors API (Phase 5)', () => {
  let organizerCookies = [];
  let attendeeCookies = [];
  let testEvent = null;
  let createdSponsor = null;

  beforeAll(async () => {
    // 1. Create Organizer
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Exhibition Director',
      email: 'director.sponsor@eventforge.test',
      password: 'Password123!',
      organizationName: 'Global Expo Systems',
    });
    organizerCookies = orgRes.headers['set-cookie'];

    // 2. Create Regular Attendee
    const attRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Regular Attendee',
      email: 'attendee.sponsor@eventforge.test',
      password: 'Password123!',
    });
    attendeeCookies = attRes.headers['set-cookie'];

    // 3. Create Event
    const startDate = new Date(Date.now() + 86400000 * 20).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 25).toISOString();

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Cookie', organizerCookies)
      .send({
        title: 'International Cloud & AI Expo 2026',
        type: 'exhibition',
        status: 'published',
        startDate,
        endDate,
        capacity: 1000,
        isVirtual: false,
      });

    testEvent = eventRes.body.data.event;
  });

  describe('Sponsor Creation & Booth Conflict Prevention', () => {
    it('should create a platinum sponsor with booth assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/sponsors/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .field('name', 'Nvidia Cloud Technologies')
        .field('tier', 'platinum')
        .field('websiteUrl', 'https://nvidia.com')
        .field('description', 'Pioneering accelerated computing and AI infrastructure.')
        .field('boothNumber', 'Booth P-101')
        .field('contactName', 'Jensen Tech')
        .field('contactEmail', 'partner@nvidia.com')
        .attach(
          'contract',
          Buffer.from('CONFIDENTIAL SPONSORSHIP CONTRACT AGREEMENT 2026'),
          'nvidia-contract.pdf'
        );

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sponsor.name).toBe('Nvidia Cloud Technologies');
      expect(res.body.data.sponsor.tier).toBe('platinum');
      expect(res.body.data.sponsor.boothNumber).toBe('Booth P-101');
      expect(res.body.data.sponsor.contractDocument).toBeDefined();
      expect(res.body.data.sponsor.contractDocument.originalName).toBe('nvidia-contract.pdf');

      createdSponsor = res.body.data.sponsor;
    });

    it('should prevent double-booking the same booth for another sponsor (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/sponsors/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          name: 'Rival GPU Systems',
          tier: 'gold',
          boothNumber: 'Booth P-101', // Already taken by Nvidia!
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already allocated to sponsor/i);
    });

    it('should create a second gold sponsor at an available booth', async () => {
      const res = await request(app)
        .post(`/api/v1/sponsors/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          name: 'Amazon Web Services',
          tier: 'gold',
          websiteUrl: 'https://aws.amazon.com',
          boothNumber: 'Booth G-201',
          contactName: 'AWS Partnerships',
          contactEmail: 'sponsorships@amazon.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sponsor.name).toBe('Amazon Web Services');
      expect(res.body.data.sponsor.tier).toBe('gold');
    });
  });

  describe('Public Sponsor Listings & Tier Breakdown (User Change #8)', () => {
    it('should fetch all sponsors for the event without authentication', async () => {
      const res = await request(app).get(`/api/v1/sponsors/event/${testEvent._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sponsors.length).toBe(2);
    });

    it('should group sponsors accurately by tier', async () => {
      const res = await request(app).get(`/api/v1/sponsors/event/${testEvent._id}/tiers`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tiers.platinum.length).toBe(1);
      expect(res.body.data.tiers.platinum[0].name).toBe('Nvidia Cloud Technologies');
      expect(res.body.data.tiers.gold.length).toBe(1);
      expect(res.body.data.tiers.gold[0].name).toBe('Amazon Web Services');
      expect(res.body.data.tiers.silver.length).toBe(0);
    });
  });

  describe('Sponsor Representative Invites (User Change #4)', () => {
    it('should invite a sponsor representative and create EventMembership with role sponsor', async () => {
      const res = await request(app)
        .post(`/api/v1/sponsors/${createdSponsor._id}/invite`)
        .set('Cookie', organizerCookies)
        .send({
          email: 'jensen.rep@nvidia.com',
          name: 'Jensen Representative',
          company: 'Nvidia Corp',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.representative.email).toBe('jensen.rep@nvidia.com');

      // Verify EventMembership with role 'sponsor' created
      const membership = await EventMembership.findOne({
        user: res.body.data.representative._id,
        event: testEvent._id,
      });

      expect(membership).toBeTruthy();
      expect(membership.role).toBe('sponsor');
    });
  });

  describe('Authenticated Private File Serving (User Change #7)', () => {
    it('should reject unauthenticated request to private sponsor contract (401)', async () => {
      const res = await request(app).get(`/api/v1/sponsors/${createdSponsor._id}/contract`);

      expect(res.status).toBe(401);
    });

    it('should reject non-organizer attendee from accessing private contract (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/sponsors/${createdSponsor._id}/contract`)
        .set('Cookie', attendeeCookies);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Unauthorized/i);
    });

    it('should serve private contract to the authorized event organizer (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/sponsors/${createdSponsor._id}/contract`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      const responseContent = res.text || (res.body ? res.body.toString() : '');
      expect(responseContent).toContain('CONFIDENTIAL SPONSORSHIP CONTRACT');
    });
  });

  describe('Sponsor Updates & Deletion', () => {
    it('should update sponsor details', async () => {
      const res = await request(app)
        .patch(`/api/v1/sponsors/${createdSponsor._id}`)
        .set('Cookie', organizerCookies)
        .send({
          description: 'Updated description: Global AI supercomputing leader.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.sponsor.description).toBe(
        'Updated description: Global AI supercomputing leader.'
      );
    });

    it('should delete a sponsor', async () => {
      const res = await request(app)
        .delete(`/api/v1/sponsors/${createdSponsor._id}`)
        .set('Cookie', organizerCookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed successfully/i);

      // Verify removed
      const checkRes = await request(app).get(`/api/v1/sponsors/${createdSponsor._id}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
