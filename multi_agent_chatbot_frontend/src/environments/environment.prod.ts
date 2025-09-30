export const environment = {
  production: true,
  LLM_API_URL: (globalThis as any)?.ENV_LLM_API_URL || '',
  LLM_API_KEY: (globalThis as any)?.ENV_LLM_API_KEY || '',
  LLM_CHAT_COMPLETIONS_PATH: (globalThis as any)?.ENV_LLM_CHAT_COMPLETIONS_PATH || '/v1/chat/completions',
  LLM_TIMEOUT_MS: Number((globalThis as any)?.ENV_LLM_TIMEOUT_MS || 20000),
};
