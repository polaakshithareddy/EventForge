import { z } from 'zod';

export const createRegistrationSchema = z.object({
  body: z.object({
    eventId: z.string().min(1, 'Event ID is required'),
    ticketTypeName: z.string().min(1, 'Ticket tier is required'),
    notes: z.string().optional(),
  }),
});

export const checkInSchema = z.object({
  body: z.object({
    ticketCode: z.string().min(3, 'Ticket code or payload is required'),
  }),
});

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(['paid', 'unpaid', 'refunded', 'free']),
  }),
});
