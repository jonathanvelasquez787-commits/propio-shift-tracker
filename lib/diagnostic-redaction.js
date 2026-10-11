// Redact before truncation: the end of a truncated token is still sensitive.
export function cleanDiagnostic(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/https?:\/\/[^\s<>"']+/gi, url => url.replace(/[?#].*$/, '[parameters]'))
    // Unquoted credentials can contain spaces and punctuation (Basic/Digest,
    // passphrases). Discard their remaining line rather than guessing words.
    .replace(/(["']?authorization["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\r\n]+)/gi, '$1[redacted]')
    .replace(/\bBearer\s+[^\s,"']+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/\b(?:sb_secret_|sb_publishable_|ghp_|github_pat_|sk_live_|sk_test_)[A-Za-z0-9_-]+/g, '[key]')
    .replace(/(["']?(?:password|passwd|access_token|refresh_token|client_secret|api_key|apikey)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\r\n]+)/gi, '$1[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .slice(0, max);
}
