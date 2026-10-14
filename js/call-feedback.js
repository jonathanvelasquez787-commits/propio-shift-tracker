let silentCalls = 0;

export function callFeedbackSilenced() { return silentCalls > 0; }
export function withSilentCallFeedback(operation) {
  silentCalls++;
  try { return operation(); } finally { silentCalls--; }
}
