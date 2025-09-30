export type ProtocolStepType = 'plan' | 'retrieve' | 'rerank' | 'pack' | 'generate' | 'reflect' | 'tool' | 'route' | 'error';

export interface ProtocolActor {
  /** Which agent or component performed this step */
  id: string;
  name: string;
  icon?: string;
}

export interface ProtocolInput {
  /** Natural language input or query */
  text?: string;
  /** Optional structured fields */
  fields?: Record<string, unknown>;
}

export interface ProtocolOutput {
  /** Output text or summary */
  text?: string;
  /** Optional structured fields */
  fields?: Record<string, unknown>;
}

export interface RetrievalItem {
  id: string;
  /** Where it came from (index, collection, url, file path) */
  source: string;
  title?: string;
  snippet: string;
  score?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalBatch {
  /** The query used for this batch */
  query: string;
  /** Retrieved items */
  items: RetrievalItem[];
}

export interface ContextWindowItem {
  /** What content was packed into the LLM context window */
  id: string;
  type: 'system' | 'instruction' | 'history' | 'retrieval' | 'tool' | 'scratchpad';
  text: string;
  tokens?: number;
  origin?: string;
}

export interface ModelCallInfo {
  /** The model used, e.g., gpt-4o, llama-3.1, etc. */
  model: string;
  /** Temperature, top_p, max_tokens, etc. */
  params?: Record<string, number>;
  /** Token counts if available */
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  /** Latency metrics if available */
  latencyMs?: number;
}

export interface ProtocolStep {
  id: string;
  at: string; // ISO
  type: ProtocolStepType;
  actor: ProtocolActor;
  input?: ProtocolInput;
  output?: ProtocolOutput;
  /** Retrievals performed at this step */
  retrieval?: RetrievalBatch;
  /** Context packing detail for the eventual model call */
  contextWindow?: ContextWindowItem[];
  /** Model call info when applicable */
  model?: ModelCallInfo;
  /** Status message or error detail */
  note?: string;
}

export interface ModelContextProtocol {
  /** Correlates to a message or turn */
  turnId: string;
  /** Steps that constructed the context and response */
  steps: ProtocolStep[];
}
