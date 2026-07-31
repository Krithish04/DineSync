const { z } = require('zod');

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, 'Invalid verification code format');

const registerRestaurantSchema = z.object({
  restaurantName: z.string().trim().min(2, 'Restaurant name must be at least 2 characters'),
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: strongPassword,
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

const registerUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: strongPassword,
  phone: z.string().trim().optional(),
  role: z.enum(['manager', 'staff', 'customer']).optional(),
  restaurantSlug: z.string().trim().min(1, 'restaurantSlug is required'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
  restaurantSlug: z.string().trim().optional(),
});

const sendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  restaurantSlug: z.string().trim().optional(),
  purpose: z.enum(['email_verification', 'password_reset']),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  restaurantSlug: z.string().trim().optional(),
  otp: otpCode,
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  restaurantSlug: z.string().trim().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  restaurantSlug: z.string().trim().optional(),
  otp: otpCode,
  newPassword: strongPassword,
});

module.exports = {
  registerRestaurantSchema,
  registerUserSchema,
  loginSchema,
  sendOtpSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
