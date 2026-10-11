export class RequestBodyError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

// Bound raw streams as well as bodies already parsed by the hosting runtime.
export async function readJsonObject(req, maxBytes) {
  const declared = req.headers?.['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > maxBytes)) {
    throw new RequestBodyError('BODY_TOO_LARGE', 413);
  }
  let raw = req.body;
  if (raw !== undefined && raw !== null && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    let serialized;
    try { serialized = JSON.stringify(raw); } catch { throw new RequestBodyError('BODY_INVALID', 400); }
    if (Buffer.byteLength(serialized || '') > maxBytes) throw new RequestBodyError('BODY_TOO_LARGE', 413);
  } else {
    if (raw === undefined || raw === null) {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > maxBytes) throw new RequestBodyError('BODY_TOO_LARGE', 413);
        chunks.push(bytes);
      }
      raw = Buffer.concat(chunks);
    }
    if (Buffer.byteLength(raw) > maxBytes) throw new RequestBodyError('BODY_TOO_LARGE', 413);
    try { raw = JSON.parse(String(raw)); } catch { throw new RequestBodyError('BODY_INVALID', 400); }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RequestBodyError('BODY_INVALID', 400);
  return raw;
}
