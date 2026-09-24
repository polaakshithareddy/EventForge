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

describe('AI Assistant & Copilot Features (Phase 7)', () => {
  let organizerCookies = [];
  let testEvent = null;

  beforeAll(async () => {
    // 1. Create Organizer
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      name: 'AI Director',
      email: 'director.ai@eventforge.test',
      password: 'Password123!',
      organizationName: 'Cognitive Events Global',
    });
    organizerCookies = orgRes.headers['set-cookie'];

    // 2. Create Event
    const startDate = new Date(Date.now() + 86400000 * 30).toISOString();
    const endDate = new Date(Date.now() + 86400000 * 32).toISOString();

    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Cookie', organizerCookies)
      .send({
        title: 'Frontier AI & Autonomous Systems Expo 2026',
        type: 'conference',
        status: 'published',
        startDate,
        endDate,
        capacity: 350,
        isVirtual: false,
      });

    testEvent = eventRes.body.data.event;

    // 3. Add sample sessions with tracks for schedule recommender test
    const s1Start = new Date(Date.now() + 86400000 * 30 + 3600000 * 10).toISOString();
    const s1End = new Date(Date.now() + 86400000 * 30 + 3600000 * 11).toISOString();

    await request(app)
      .post(`/api/v1/sessions/event/${testEvent._id}`)
      .set('Cookie', organizerCookies)
      .send({
        title: 'Deep Reinforcement Learning & Autonomous Agents',
        description: 'Building multi-agent reasoning loops and production LLM orchestration.',
        track: { name: 'Machine Learning', color: '#4f46e5' },
        room: 'Hall A',
        startTime: s1Start,
        endTime: s1End,
        tags: ['Machine Learning', 'Reinforcement Learning', 'Agents'],
      });

    const s2Start = new Date(Date.now() + 86400000 * 30 + 3600000 * 12).toISOString();
    const s2End = new Date(Date.now() + 86400000 * 30 + 3600000 * 13).toISOString();

    await request(app)
      .post(`/api/v1/sessions/event/${testEvent._id}`)
      .set('Cookie', organizerCookies)
      .send({
        title: 'Cloud Infrastructure & High-Performance Computing',
        description: 'GPU cluster management and distributed training patterns at scale.',
        track: { name: 'Cloud & Systems', color: '#059669' },
        room: 'Hall B',
        startTime: s2Start,
        endTime: s2End,
        tags: ['Cloud', 'HPC', 'DevOps'],
      });
  });

  describe('Event Marketing Copy Generator', () => {
    it('should generate structured marketing copy with description, tagline, and teasers', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-event-copy')
        .send({
          title: 'NextGen Cloud & Security Summit',
          type: 'conference',
          topics: ['Zero Trust', 'Kubernetes', 'Cyber Defense'],
          tone: 'technical',
          targetAudience: 'Chief Information Security Officers and Cloud Architects',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const copy = res.body.data;
      expect(copy.title).toBe('NextGen Cloud & Security Summit');
      expect(copy.tagline).toBeTruthy();
      expect(copy.shortSummary).toContain('Chief Information Security Officers');
      expect(copy.description).toContain('NextGen Cloud & Security Summit');
      expect(copy.description).toContain('Zero Trust');
      expect(copy.socialTeasers.length).toBeGreaterThan(0);
      expect(copy.keyTakeaways.length).toBeGreaterThan(0);
    });
  });

  describe('Structured Multi-Track Agenda Generator', () => {
    it('should generate multi-track schedule outline with sessions and durations', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-agenda')
        .send({
          eventTitle: 'DevOps & AI Architecture Days',
          tracksCount: 2,
          sessionsPerTrack: 3,
          topics: ['Platform Engineering', 'GenAI in Production'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const agenda = res.body.data;
      expect(agenda.tracks.length).toBe(2);
      expect(agenda.totalSessions).toBe(6);
      expect(agenda.sessions[0].title).toBeTruthy();
      expect(agenda.sessions[0].trackName).toBeTruthy();
      expect(agenda.sessions[0].durationMinutes).toBeGreaterThan(0);
      expect(agenda.sessions[0].room).toBeTruthy();
    });
  });

  describe('Speaker Bio Polisher & Talk Recommender', () => {
    it('should polish raw speaker notes into an executive bio with suggested talks', async () => {
      const res = await request(app)
        .post('/api/v1/ai/polish-speaker-bio')
        .send({
          name: 'Elena Rostova',
          company: 'Hyperscale AI Labs',
          jobTitle: 'VP of Engineering',
          rawBio: 'lead 120 engineers working on foundation models and distributed gpu training clusters.',
          speakerTopics: ['Foundation Models', 'Distributed Systems'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const bioData = res.body.data;
      expect(bioData.name).toBe('Elena Rostova');
      expect(bioData.polishedBio).toContain('Elena Rostova');
      expect(bioData.polishedBio).toContain('VP of Engineering at Hyperscale AI Labs');
      expect(bioData.shortBio).toBeTruthy();
      expect(bioData.suggestedTalks.length).toBeGreaterThan(0);
    });
  });

  describe('Personalized Schedule Recommender (Attendee AI Itinerary)', () => {
    it('should recommend sessions matching attendee interests with match scores & rationales', async () => {
      const res = await request(app)
        .post('/api/v1/ai/recommend-sessions')
        .send({
          eventId: testEvent._id,
          interests: ['Machine Learning', 'Agents'],
          jobTitle: 'Machine Learning Engineer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const recData = res.body.data;
      expect(recData.recommendations.length).toBe(2);

      // The ML session should have a higher match score than the Cloud session
      const topRec = recData.recommendations[0];
      expect(topRec.session.title).toContain('Deep Reinforcement Learning');
      expect(topRec.matchScore).toBeGreaterThanOrEqual(80);
      expect(topRec.matchReason).toContain('matches "Machine Learning"');
    });
  });

  describe('Organizer AI Copilot Interactive Assistant', () => {
    it('should provide contextual event planning guidance and ticketing advice', async () => {
      const res = await request(app)
        .post('/api/v1/ai/copilot-chat')
        .send({
          message: 'How should I structure ticket pricing for our conference?',
          eventId: testEvent._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.response).toContain('Early Bird Pass');
      expect(res.body.data.response).toContain('VIP Executive Pass');
      expect(res.body.data.context.title).toBe(
        'Frontier AI & Autonomous Systems Expo 2026'
      );
    });

    it('should draft an attendee announcement email when requested', async () => {
      const res = await request(app)
        .post('/api/v1/ai/copilot-chat')
        .send({
          message: 'Can you draft a launch announcement email for this event?',
          eventId: testEvent._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.response).toContain('Subject:');
      expect(res.body.data.response).toContain('Frontier AI & Autonomous Systems Expo 2026');
    });
  });
});
