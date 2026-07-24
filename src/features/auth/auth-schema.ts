import { z } from 'zod';

import { env } from '@/lib/env';

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(10)
      .regex(/[a-z]/, 'Use at least one lowercase letter.')
      .regex(/[A-Z]/, 'Use at least one uppercase letter.')
      .regex(/[0-9]/, 'Use at least one number.')
  })
  .refine(({ email }) => email.endsWith(`@${env.universityEmailDomain.toLowerCase()}`), {
    path: ['email'],
    message: `Use your @${env.universityEmailDomain} university email.`
  });

export const signInSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Enter your password.')
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  graduationYear: z.coerce
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 10),
  bio: z.string().trim().max(280),
  interestIds: z.array(z.uuid()).min(3).max(5)
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type OnboardingInput = z.input<typeof onboardingSchema>;
