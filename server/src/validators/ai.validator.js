import { z } from 'zod';

export const generateCopySchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Event title is required'),
    type: z.string().optional().default('conference'),
    topics: z.union([z.array(z.string()), z.string()]).optional(),
    tone: z
      .enum(['professional', 'inspirational', 'energetic', 'technical'])
      .default('professional'),
    targetAudience: z.string().optional().or(z.literal('')),
  }),
});

export const generateAgendaSchema = z.object({
  body: z.object({
    eventTitle: z.string().min(2, 'Event title is required'),
    tracksCount: z.coerce.number().int().min(1).max(5).default(2),
    sessionsPerTrack: z.coerce.number().int().min(1).max(6).default(3),
    topics: z.union([z.array(z.string()), z.string()]).optional(),
    audience: z.string().optional().or(z.literal('')),
  }),
});

export const polishBioSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Speaker name is required'),
    company: z.string().optional().or(z.literal('')),
    jobTitle: z.string().optional().or(z.literal('')),
    rawBio: z.string().min(5, 'Raw bio draft is required'),
    speakerTopics: z.union([z.array(z.string()), z.string()]).optional(),
  }),
});

export const recommendSessionsSchema = z.object({
  body: z.object({
    eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event ID'),
    interests: z.union([z.array(z.string()), z.string()]).optional(),
    jobTitle: z.string().optional().or(z.literal('')),
  }),
});

export const copilotChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .optional()
      .default([]),
    eventId: z.string().optional().or(z.literal('')),
  }),
});
