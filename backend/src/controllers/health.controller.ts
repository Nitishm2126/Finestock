import { Request, Response, NextFunction } from 'express';
import { checkSupabaseHealth } from '../config/supabase.js';

export async function getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supabaseHealth = await checkSupabaseHealth();

    res.status(200).json({
      success: true,
      message: 'Fine Stock API is running',
      services: {
        supabase: supabaseHealth.status,
      },
    });
  } catch (error) {
    next(error);
  }
}
