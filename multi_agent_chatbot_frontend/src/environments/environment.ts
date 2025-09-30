export const environment = {
  production: false,
  // Backend LLM API configuration (build-time injected)
  LLM_API_URL: (globalThis as any)?.ENV_LLM_API_URL || '',
  LLM_API_KEY: (globalThis as any)?.ENV_LLM_API_KEY || '',
  // Optional: endpoints if different paths are used by your backend
  LLM_CHAT_COMPLETIONS_PATH: (globalThis as any)?.ENV_LLM_CHAT_COMPLETIONS_PATH || '/v1/chat/completions',
  // Optional timeout in ms
  LLM_TIMEOUT_MS: Number((globalThis as any)?.ENV_LLM_TIMEOUT_MS || 20000),
};
