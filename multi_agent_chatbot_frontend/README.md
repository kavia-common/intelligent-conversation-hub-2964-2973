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

Currently the ChatService simulates:
1. Planning (plan/route)
2. Retrieval (retrieve)
3. Context packing (pack)
4. Generation (generate) with mock LLM metadata

To integrate a real backend:
- Replace the mocked pipeline in `ChatService.sendMessage()` with your HTTP/WebSocket flow.
- On retrieval completion, call `this.mcp.appendStep(turnId, { type: 'retrieve', ... })` with your retrieved items.
- Before model call, append a `pack` step with your context window composition.
- After model call, append a `generate` step with `model` info (model name, params, token usage, latency).
- Attach backend-returned `RagContext` to the reply message as `context` and include `llm` metadata.

Environment variables:
- Do not hardcode URLs or keys. Add a `.env.example` with variables (e.g., ANGULAR_APP_API_URL) and read via your preferred mechanism (build-time replacement, etc.). The orchestrator will provide real values.

## Notes

This frontend uses a mocked ChatService to simulate multi-agent behavior, RAG context, LLM generation, and a Model Context Protocol timeline. Integrate with your backend by replacing the mocked flows with HTTP/WebSocket calls in `ChatService` and keeping MCP updates in `ModelContextService`.
