import { z } from 'zod';

const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket name is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  description: z.string().optional(),
});

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(3, 'Title must be at least 3 characters'),
      description: z.string().optional(),
      type: z
        .enum(['conference', 'workshop', 'exhibition', 'corporate', 'webinar', 'other'])
        .default('conference'),
      status: z.enum(['draft', 'published', 'cancelled', 'completed']).default('draft'),
      startDate: z.string().datetime({ message: 'Valid UTC startDate is required (ISO 8601)' }),
      endDate: z.string().datetime({ message: 'Valid UTC endDate is required (ISO 8601)' }),
      timezone: z.string().default('UTC'),
      venue: z.string().optional().nullable(),
      isVirtual: z.boolean().default(false),
      virtualLink: z.string().url().optional().or(z.literal('')).nullable(),
      capacity: z.number().int().min(1, 'Capacity must be at least 1'),
      registrationDeadline: z.string().datetime().optional().nullable(),
      ticketTypes: z.array(ticketTypeSchema).optional(),
      tags: z.array(z.string()).optional(),
      coverImage: z.string().optional().or(z.literal('')),
      isPublic: z.boolean().default(true),
    })
    .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
      message: 'End date must be after start date',
      path: ['endDate'],
    }),
});

export const updateEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      type: z.enum(['conference', 'workshop', 'exhibition', 'corporate', 'webinar', 'other']).optional(),
      status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      timezone: z.string().optional(),
      venue: z.string().optional().nullable(),
      isVirtual: z.boolean().optional(),
      virtualLink: z.string().url().optional().or(z.literal('')).nullable(),
      capacity: z.number().int().min(1).optional(),
      registrationDeadline: z.string().datetime().optional().nullable(),
      ticketTypes: z.array(ticketTypeSchema).optional(),
      tags: z.array(z.string()).optional(),
      coverImage: z.string().optional().or(z.literal('')),
      isPublic: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) < new Date(data.endDate);
        }
        return true;
      },
      {
        message: 'End date must be after start date',
        path: ['endDate'],
      }
    ),
});

export const sessionSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, 'Title must be at least 2 characters'),
      description: z.string().optional(),
      startTime: z.string().datetime({ message: 'Valid UTC startTime is required' }),
      endTime: z.string().datetime({ message: 'Valid UTC endTime is required' }),
      room: z.string().optional(),
      capacity: z.number().int().min(1).optional(),
      tags: z.array(z.string()).optional(),
      speakers: z.array(z.string()).optional(),
    })
    .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
      message: 'Session end time must be after start time',
      path: ['endTime'],
    }),
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    role: z.enum(['organizer', 'staff', 'speaker', 'sponsor']),
    name: z.string().optional(),
  }),
});
