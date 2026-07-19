import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: z.string(),
  partnerStatus: z.string(),
  creditBalance: z.number().optional(),
  referralCode: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  long_description: z.string().nullable(),
  level: z.string(),
  duration: z.string(),
  price_usd: z.number(),
  price_inr: z.number(),
  category: z.string(),
  thumbnail_url: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
});
export type Course = z.infer<typeof CourseSchema>;

export const EnrollmentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  enrolled_at: z.string(),
  progress_percent: z.number(),
  status: z.string(),
});
export type Enrollment = z.infer<typeof EnrollmentSchema>;
