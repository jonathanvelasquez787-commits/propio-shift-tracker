// POST /api/delete-account   (Authorization: Bearer <access_token>)
//
// Borra la cuenta entera: auth.users -> cascade -> profiles y user_data.
// Existe porque la política de privacidad promete que los datos se pueden
// borrar, y borrar un usuario de auth requiere la service_role key, que nunca
// puede estar en el navegador.
//
// El token que manda el cliente se valida contra Supabase antes de tocar nada:
// nadie puede borrar la cuenta de otro pasando un id distinto, porque el id
// no se lee del cuerpo, se deriva del token.

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('delete-account: faltan variables de entorno de Supabase');
    res.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return;
  }

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'NOT_AUTHENTICATED' });
    return;
  }

  try {
    const meRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      res.status(401).json({ error: 'NOT_AUTHENTICATED' });
      return;
    }
    const me = await meRes.json();
    if (!me || !me.id) {
      res.status(401).json({ error: 'NOT_AUTHENTICATED' });
      return;
    }

    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${me.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });

    if (!delRes.ok) {
      const detail = await delRes.text().catch(() => '');
      console.error('delete-account: fallo al borrar', delRes.status, detail);
      res.status(500).json({ error: 'DELETE_FAILED' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('delete-account: error inesperado', err);
    res.status(500).json({ error: 'DELETE_FAILED' });
  }
}
