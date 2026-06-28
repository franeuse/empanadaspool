import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Ojo: Faltan las variables de entorno de Supabase en el archivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);