import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, 'Title must be at least 2 characters'),
      description: z.string().optional(),
      track: z
        .object({
          name: z.string().min(1, 'Track name is required').default('General'),
          color: z.string().min(3).default('#4f46e5'),
        })
        .optional(),
      room: z.string().min(1, 'Room/Hall assignment is required').default('Main Hall'),
      startTime: z.string().datetime({ message: 'Valid UTC startTime is required (ISO 8601)' }),
      endTime: z.string().datetime({ message: 'Valid UTC endTime is required (ISO 8601)' }),
      speakers: z.array(z.string()).optional(),
      capacity: z.number().int().min(1).optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
      message: 'Session end time must be after start time',
      path: ['endTime'],
    }),
});

export const updateSessionSchema = z.object({
  body: z
    .object({
      title: z.string().min(2).optional(),
      description: z.string().optional(),
      track: z
        .object({
          name: z.string().min(1).optional(),
          color: z.string().optional(),
        })
        .optional(),
      room: z.string().min(1).optional(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      speakers: z.array(z.string()).optional(),
      capacity: z.number().int().min(1).optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return new Date(data.startTime) < new Date(data.endTime);
        }
        return true;
      },
      {
        message: 'Session end time must be after start time',
        path: ['endTime'],
      }
    ),
});

export const speakerInviteSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    name: z.string().min(2, 'Speaker name is required'),
    bio: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    speakerTopics: z.array(z.string()).optional(),
  }),
});

export const updateSpeakerProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    bio: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    socialLinks: z
      .object({
        twitter: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
    speakerTopics: z.array(z.string()).optional(),
  }),
});
