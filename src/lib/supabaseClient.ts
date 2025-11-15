import { createClient } from '@supabase/supabase-js';

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Las variables de entorno de Supabase no están configuradas correctamente');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Definido' : 'No definido');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definido' : 'No definido');
}

// Crear el cliente de Supabase
export const supabase = createClient(
  supabaseUrl || 'https://tu-url-de-supabase.supabase.co',
  supabaseAnonKey || 'tu-clave-anonima',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Tablas de la base de datos
export const TABLES = {
  QUOTES: 'quotes',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  QUOTE_ITEMS: 'quote_items'
};

// Función para verificar la conexión con Supabase
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('quotes').select('*').limit(1);
    if (error) throw error;
    return { connected: true, error: null };
  } catch (error) {
    console.error('Error de conexión con Supabase:', error);
    return { connected: false, error };
  }
};
