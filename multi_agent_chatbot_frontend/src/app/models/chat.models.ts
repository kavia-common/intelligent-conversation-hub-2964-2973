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

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string; // ISO
  agentId?: string;
  context?: RagContext;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  agentId: string;
  messages: Message[];
}
