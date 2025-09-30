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
- Keyboard shortcut: Ctrl/Cmd + Enter to send
- Smooth transitions, subtle gradients, and interactive highlights

## Structure

- src/app/pages/chat-page: Main page layout and UI
- src/app/services/chat.service.ts: Mocked agent pipeline + RAG retrieval
- src/app/models/chat.models.ts: Typed models for messages, agents, and RAG
- src/styles.css: Global Ocean Professional theme variables and layout styles

## Notes

This frontend uses a mocked ChatService to simulate multi-agent behavior and RAG context. Integrate with your backend by replacing the mocked flows with HTTP/WebSocket calls in `ChatService`.
