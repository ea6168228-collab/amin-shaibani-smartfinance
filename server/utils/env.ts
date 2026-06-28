import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'amin_shaibani_super_secret_key',
  APP_LICENSE_SECRET: process.env.APP_LICENSE_SECRET || 'amin_license_secret_2026',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
  BACKUP_TOKEN_SECRET: process.env.BACKUP_TOKEN_SECRET || 'backup_secret_here',
};

export function validateEnv() {
  const missing: string[] = [];
  if (!ENV.GEMINI_API_KEY) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not defined.");
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}
