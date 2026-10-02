// This module provides safe build-time fallbacks for the Supabase client helpers.
// Vercel must still have the real NEXT_PUBLIC_SUPABASE_* variables configured for runtime.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://liijxwiambsqapgbbfre.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_GyODiS7B9beDYe2G47-olg_ctTuIdEp";
