import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  port: number;
  frontendUrl: string;
  supabase: {
    url: string | null;
    anonKey: string | null;
    serviceRoleKey: string | null;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL || null,
    anonKey: process.env.SUPABASE_ANON_KEY || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  },
};
