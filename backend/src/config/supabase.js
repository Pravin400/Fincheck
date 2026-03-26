import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('❌ Missing SUPABASE_URL in .env file');
}

// Use service role key if available (bypasses RLS), otherwise fall back to anon key
const key = supabaseServiceKey || supabaseAnonKey;

if (supabaseServiceKey) {
    console.log('✅ Using Supabase service role key (RLS bypassed)');
} else {
    console.warn('⚠️  No SUPABASE_SERVICE_ROLE_KEY found. Using anon key — RLS policies may block operations.');
    console.warn('   Add SUPABASE_SERVICE_ROLE_KEY to your .env file from Supabase Dashboard → Settings → API');
}

export const supabase = createClient(supabaseUrl, key);

export default supabase;
