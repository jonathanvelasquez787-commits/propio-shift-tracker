// Cliente Supabase único, compartido por la landing y por la app.
//
// Se carga desde jsDelivr con la versión PINCHADA a propósito: un `@2` flotante
// puede traer un cambio de comportamiento el día menos pensado en una app que
// no tiene build ni lockfile. Para actualizar: subir el número acá, probar
// login + sync, y recién ahí desplegar.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';

let client = null;

export function getSupabase() {
  if (!isConfigured()) {
    throw new Error(
      'Supabase sin configurar: falta editar js/config.js con la URL y la anon key del proyecto.'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // La landing recibe el retorno de Google con el código en la URL y
        // necesita canjearlo sola.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export { isConfigured };
