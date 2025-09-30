# Multi-Agent Chatbot Frontend (Angular)

Modern Angular SPA for interacting with a multi-agent, RAG-powered chatbot. Implements the Ocean Professional theme with a responsive layout: top navigation, sidebar (agents and chats), main chat area, and a context panel.

## Run locally

```bash
npm install
npm start
# app runs at http://localhost:3000
```

## Features

- Multi-agent selection (Planner, Researcher, Writer)
- Chat history with message bubbles and timestamps
- Agent state indicators (idle, thinking, retrieving, responding)
- RAG context evidence snippets attached to agent replies
- Model Context Protocol (MCP) timeline per message and in the right panel
- LLM call info badges (model, latency) on assistant messages
- Keyboard shortcut: Ctrl/Cmd + Enter to send
- Smooth transitions, subtle gradients, and interactive highlights

## Structure

- src/app/pages/chat-page: Main page layout and UI
- src/app/services/chat.service.ts: Mocked agent pipeline + RAG retrieval + LLM simulate + MCP steps
- src/app/services/model-context.service.ts: Manages MCP timelines by turn id
- src/app/models/chat.models.ts: Typed models for messages, agents, RAG, and LLM call info
- src/app/models/context.models.ts: Typed models for MCP protocol, retrieval batches, context windows
- src/styles.css: Global Ocean Professional theme variables and layout styles

## Backend/LLM Integration

The ChatService now supports a real backend via an injectable `LlmClientService`:
- Configuration is provided via environment files using build-time variables.
- If the backend is not configured, the app preserves the original mock behavior for local development.

How it works:
1. `ChatService.sendMessage()` normalizes input and creates a protocol turn.
2. If environment variables provide `ENV_LLM_API_URL`, the service calls the backend using `LlmClientService.chatCompletions()`:
   - It passes conversation messages, selected agent id, and optional model params.
   - The backend may return: assistant content, RAG context, LLM model metadata, and optional MCP steps.
   - Any returned protocol steps are appended to the Model Context Protocol timeline.
3. If the backend is unavailable or returns an error, the service falls back to the local mock pipeline (plan → retrieve → pack → generate), ensuring a seamless UX.

Environment variables (build-time):
- ENV_LLM_API_URL: Base URL of your backend (e.g., https://api.example.com)
- ENV_LLM_API_KEY: Optional secret for Authorization header
- ENV_LLM_CHAT_COMPLETIONS_PATH: Path for chat completions (default /v1/chat/completions)
- ENV_LLM_TIMEOUT_MS: Request timeout in ms (default 20000)

See `.env.example` for a template. The deployment orchestrator maps real values into these variables during build.

Customizing endpoints:
- Edit `src/environments/*` to adjust endpoint paths and defaults.
- `LlmClientService` composes URLs as `${LLM_API_URL}/${LLM_CHAT_COMPLETIONS_PATH}`.

WebSocket support (optional):
- This implementation uses REST via HttpClient.
- To add WebSocket streaming later, create a `LlmSocketClientService` with a similar interface and inject it instead of (or alongside) `LlmClientService`.

Security:
- Do not hardcode secrets. Provide keys via environment variables only.
- Consider a backend proxy to avoid exposing third-party model API keys to the browser.

## Notes

This frontend will:
- Use the backend for live responses and RAG when configured.
- Visualize MCP steps returned by the backend or locally synthesized ones.
- Maintain full functionality with mocked data when no backend config is present.
