import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  CLIENT_URL: z.string().url(),
  MONGODB_URI: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  USE_LOCAL_STORAGE: z.string().default('true'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  USE_STRIPE: z.string().default('false'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  STORE_NAME: z.string().default('Abaya House'),
  STORE_EMAIL: z.string().email().optional(),
  STORE_PHONE: z.string().optional(),
  TAX_RATE: z.string().default('0.18'),
  SHIPPING_FLAT_RATE: z.string().default('50'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  ...parsed.data,
  PORT: parseInt(parsed.data.PORT),
  TAX_RATE: parseFloat(parsed.data.TAX_RATE),
  SHIPPING_FLAT_RATE: parseFloat(parsed.data.SHIPPING_FLAT_RATE),
  USE_LOCAL_STORAGE: parsed.data.USE_LOCAL_STORAGE === 'true',
  USE_STRIPE: parsed.data.USE_STRIPE === 'true',
  SMTP_SECURE: parsed.data.SMTP_SECURE === 'true',
  SMTP_PORT: parsed.data.SMTP_PORT ? parseInt(parsed.data.SMTP_PORT) : 587,
  RATE_LIMIT_WINDOW_MS: parseInt(parsed.data.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsed.data.RATE_LIMIT_MAX_REQUESTS),
};
