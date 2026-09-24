import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

describe('Sessions, Speakers & Multi-Track Scheduling API', () => {
  let organizerCookies = [];
  let testEvent = null;
  let testSpeaker = null;
  let createdSession = null;

  beforeAll(async () => {
    // 1. Create Organizer
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Event Director',
      email: 'director.session@eventforge.test',
      password: 'Password123!',
      organizationName: 'Nexus Conferences',
    });
    organizerCookies = orgRes.headers['set-cookie'];

    // 2. Create Event (5-day conference)
    const startDate = new Date(Date.now() + 86400000 * 10).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 15).toISOString();

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Cookie', organizerCookies)
      .send({
        title: 'Future Tech & AI Summit 2026',
        type: 'conference',
        status: 'published',
        startDate,
        endDate,
        capacity: 500,
        isVirtual: true,
      });

    testEvent = eventRes.body.data.event;
  });

  describe('Speaker Management & Invites (User Change #4)', () => {
    it('should invite a speaker by email and create EventMembership', async () => {
      const res = await request(app)
        .post(`/api/v1/sessions/event/${testEvent._id}/speakers/invite`)
        .set('Cookie', organizerCookies)
        .send({
          email: 'ai.researcher@mit.test',
          name: 'Prof. Alan Vance',
          company: 'MIT AI Lab',
          jobTitle: 'Head of Autonomous Systems',
          bio: 'Leading researcher in generative AI architectures.',
          speakerTopics: ['Deep Learning', 'Autonomous Agents'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testSpeaker = res.body.data.speaker;
      expect(testSpeaker.name).toBe('Prof. Alan Vance');
      expect(testSpeaker.company).toBe('MIT AI Lab');

      // Verify speaker EventMembership in DB
      const membership = await EventMembership.findOne({
        event: testEvent._id,
        user: testSpeaker._id,
        role: 'speaker',
      });
      expect(membership).toBeTruthy();
    });

    it('should list all speakers for the event', async () => {
      const res = await request(app).get(`/api/v1/sessions/event/${testEvent._id}/speakers`);

      expect(res.status).toBe(200);
      expect(res.body.data.speakers.length).toBeGreaterThan(0);
      expect(res.body.data.speakers[0].name).toBe('Prof. Alan Vance');
    });
  });

  describe('Session Creation & Multi-Track Scheduling', () => {
    it('should create a multi-track session with room and speaker', async () => {
      const sessionStart = new Date(new Date(testEvent.startDate).getTime() + 3600000).toISOString();
      const sessionEnd = new Date(new Date(testEvent.startDate).getTime() + 7200000).toISOString();

      const res = await request(app)
        .post(`/api/v1/sessions/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          title: 'Opening Keynote: Next-Gen Neural Networks',
          description: 'A deep dive into frontier reasoning models',
          track: { name: 'Artificial Intelligence', color: '#6366f1' },
          room: 'Grand Auditorium A',
          startTime: sessionStart,
          endTime: sessionEnd,
          speakers: [testSpeaker._id],
          capacity: 400,
          tags: ['Keynote', 'AI'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdSession = res.body.data.session;
      expect(createdSession.title).toBe('Opening Keynote: Next-Gen Neural Networks');
      expect(createdSession.track.name).toBe('Artificial Intelligence');
      expect(createdSession.room).toBe('Grand Auditorium A');
    });

    it('should prevent room double-booking during overlapping UTC time window (User Change #6)', async () => {
      // Overlapping time window in same room
      const overlapStart = new Date(new Date(createdSession.startTime).getTime() + 1800000).toISOString();
      const overlapEnd = new Date(new Date(createdSession.endTime).getTime() + 1800000).toISOString();

      const res = await request(app)
        .post(`/api/v1/sessions/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          title: 'Conflicting Workshop',
          track: { name: 'Engineering', color: '#10b981' },
          room: 'Grand Auditorium A', // Same room
          startTime: overlapStart,
          endTime: overlapEnd,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Room conflict/i);
    });

    it('should prevent speaker double-booking across different rooms at the same time (User Change #6)', async () => {
      // Overlapping time in a DIFFERENT room with the SAME speaker
      const overlapStart = new Date(new Date(createdSession.startTime).getTime() + 900000).toISOString();
      const overlapEnd = new Date(new Date(createdSession.endTime).getTime() + 900000).toISOString();

      const res = await request(app)
        .post(`/api/v1/sessions/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          title: 'Parallel Talk with Same Speaker',
          track: { name: 'Robotics', color: '#f59e0b' },
          room: 'Hall B (Different Room)',
          startTime: overlapStart,
          endTime: overlapEnd,
          speakers: [testSpeaker._id], // Double-booked speaker
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Speaker conflict/i);
    });

    it('should allow concurrent sessions in different rooms with different speakers', async () => {
      const concurrentStart = createdSession.startTime;
      const concurrentEnd = createdSession.endTime;

      const res = await request(app)
        .post(`/api/v1/sessions/event/${testEvent._id}`)
        .set('Cookie', organizerCookies)
        .send({
          title: 'Concurrent Track: Cloud Native Architecture',
          track: { name: 'Cloud Infrastructure', color: '#0ea5e9' },
          room: 'Hall B (Different Room)',
          startTime: concurrentStart,
          endTime: concurrentEnd,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Public Schedule Discovery', () => {
    it('should retrieve multi-track schedule grouped by date and tracks', async () => {
      const res = await request(app).get(`/api/v1/sessions/event/${testEvent._id}/schedule`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tracks.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.days.length).toBeGreaterThan(0);
      expect(res.body.data.totalSessions).toBeGreaterThanOrEqual(2);
    });
  });
});
