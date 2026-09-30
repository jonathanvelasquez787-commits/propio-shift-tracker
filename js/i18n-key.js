export function translationKey(source) {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `s_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
