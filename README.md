# intelligent-conversation-hub-2964-2973

This workspace contains the Angular frontend for a multi-agent, RAG-powered chatbot.

Quick start for backend integration:
- Copy multi_agent_chatbot_frontend/.env.example to your CI/CD environment variables.
- Set ENV_LLM_API_URL and optionally ENV_LLM_API_KEY to point at your LLM backend.
- Build and run. When the backend is not configured, the app uses a mock pipeline for local development.

Refer to multi_agent_chatbot_frontend/README.md for complete integration details.