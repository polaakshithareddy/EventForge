import { z } from 'zod';

export const createSponsorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Sponsor company name must be at least 2 characters'),
    tier: z.enum(['platinum', 'gold', 'silver', 'bronze', 'partner']).default('silver'),
    logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().or(z.literal('')),
    boothNumber: z.string().max(50).optional().or(z.literal('')),
    contactName: z.string().max(100).optional().or(z.literal('')),
    contactEmail: z.string().email('Invalid contact email').optional().or(z.literal('')),
    order: z.coerce.number().int().optional().default(0),
  }),
});

export const updateSponsorSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    tier: z.enum(['platinum', 'gold', 'silver', 'bronze', 'partner']).optional(),
    logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
    description: z.string().max(2000).optional().or(z.literal('')),
    boothNumber: z.string().max(50).optional().or(z.literal('')),
    contactName: z.string().max(100).optional().or(z.literal('')),
    contactEmail: z.string().email('Invalid contact email').optional().or(z.literal('')),
    order: z.coerce.number().int().optional(),
  }),
});

export const inviteSponsorRepSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    company: z.string().optional().or(z.literal('')),
  }),
});
