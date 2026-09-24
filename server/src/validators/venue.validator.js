import { z } from 'zod';

export const createVenueSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().min(2, 'City is required'),
      state: z.string().optional(),
      country: z.string().min(2, 'Country is required'),
      postalCode: z.string().optional(),
    }),
    capacity: z.number().int().min(1, 'Capacity must be at least 1'),
    amenities: z.array(z.string()).optional(),
    contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
  }),
});

export const updateVenueSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().min(2).optional(),
        state: z.string().optional(),
        country: z.string().min(2).optional(),
        postalCode: z.string().optional(),
      })
      .optional(),
    capacity: z.number().int().min(1).optional(),
    amenities: z.array(z.string()).optional(),
    contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
