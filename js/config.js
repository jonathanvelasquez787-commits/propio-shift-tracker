// Configuración pública del proyecto.
//
// La "anon key" es pública POR DISEÑO: viaja al navegador en cualquier app de
// Supabase y lo que protege los datos no es ocultarla, es Row Level Security
// (ver supabase/migrations/0001_init.sql). Lo que NUNCA va acá es la
// service_role key — esa solo vive en las variables de entorno de Vercel.
//
// Reemplazar los 2 valores de abajo con los del proyecto:
//   Supabase → Project Settings → API → Project URL / anon public
//
// Supabase está migrando los nombres de sus llaves: la de abajo puede aparecer
// como "anon public" (un JWT que empieza con eyJ...) o como "Publishable key"
// (empieza con sb_publishable_). Las dos sirven acá — son la llave pública.

export const SUPABASE_URL = 'https://ccqlvcrsoluxoymuhxnl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcWx2Y3Jzb2x1eG95bXVoeG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NDk5ODYsImV4cCI6MjEwNTQyNTk4Nn0.NXZxRqc4pPIFiDdBUruWgr2fafCXtyMwSXsIgN1OkEs';

// Nombre visible de la app (títulos, correos, textos legales).
export const APP_NAME = 'Propio Shift Tracker';

// Versión del formato del blob que se sube a user_data. Subirla solo si
// alguna vez cambia la forma de state/calls/settings de manera incompatible.
export const DATA_SCHEMA_VERSION = 1;

export function isConfigured() {
  return (
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.startsWith('https://') &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    // Umbral bajo a propósito: solo descarta el marcador sin reemplazar. Una
    // publishable key nueva es bastante más corta que el JWT de siempre, y
    // exigir la longitud del JWT la rechazaría por error.
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.startsWith('REEMPLAZAR')
  );
}
