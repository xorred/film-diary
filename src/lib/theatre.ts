import "server-only";

// Theatre mode only exists when the Anthropic key is set on the server.
export function theatreEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
