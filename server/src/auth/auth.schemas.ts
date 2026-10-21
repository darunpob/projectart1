import { z } from 'zod';

const email = z.email().trim().toLowerCase().max(254);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(60),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
