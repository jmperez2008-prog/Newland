import { createClient } from '@supabase/supabase-js';

// ¡REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE SUPABASE!
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; 
const SUPABASE_KEY = 'tu-anon-key-publica';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);