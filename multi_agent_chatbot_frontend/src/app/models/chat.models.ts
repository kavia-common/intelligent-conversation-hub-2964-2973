export type Role = 'user' | 'agent' | 'system';

export interface AgentState {
  /** Agent processing status */
  status: 'idle' | 'thinking' | 'retrieving' | 'responding' | 'error' | 'offline';
  /** Optional status message */
  note?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  /** Emoji or short code icon for the agent. */
  icon: string;
  expertise: string[];
  state: AgentState;
}

export interface RagChunk {
  id: string;
  source: string;
  title?: string;
  snippet: string;
  score?: number;
  url?: string;
}

export interface RagContext {
  query: string;
  chunks: RagChunk[];
  usedAt: string; // ISO
}

export interface LlmCallInfo {
  /** The model invoked, params and token usage when available */
  model: string;
  params?: Record<string, number>;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  latencyMs?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string; // ISO
  agentId?: string;
  /** RAG evidence bound to the message */
  context?: RagContext;
  /** Optional LLM call information */
  llm?: LlmCallInfo;
  /** Optional protocol id to correlate with protocol steps */
  protocolTurnId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  agentId: string;
  messages: Message[];
}
