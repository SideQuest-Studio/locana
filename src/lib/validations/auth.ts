import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerPartnerSchema = registerSchema.extend({
  businessName: z.string().min(2, "Enter your business name"),
  businessEmail: z.string().email("Enter a valid business email").optional().or(z.literal("")),
  businessPhone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterPartnerInput = z.infer<typeof registerPartnerSchema>;

export const approvePartnerSchema = z.object({
  partnerId: z.string().uuid(),
});

export const rejectPartnerSchema = z.object({
  partnerId: z.string().uuid(),
  reason: z.string().min(3, "Provide a rejection reason"),
});
