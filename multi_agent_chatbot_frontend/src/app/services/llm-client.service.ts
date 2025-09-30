/**
 * LlmClientService
 * Injectable REST client to communicate with a remote LLM backend.
 * Reads configuration from environment.* and exposes a chatCompletions method.
 * Falls back to disabled state (no network) if API URL is not configured.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timeout, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LlmChatCompletionRequest {
  // PUBLIC_INTERFACE
  /** Messages comprising the conversation history sent to the backend. */
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  // PUBLIC_INTERFACE
  /** Selected agent id and any extra params. */
  agentId?: string;
  // PUBLIC_INTERFACE
  /** Optional model params such as temperature, max_tokens, top_p, etc. */
  params?: Record<string, number | string | boolean>;
  // PUBLIC_INTERFACE
  /** Optional RAG directives; backends may use this to trigger retrieval. */
  rag?: {
    enable?: boolean;
    k?: number;
  };
}

export interface LlmRetrievalItem {
  id: string;
  source: string;
  title?: string;
  snippet: string;
  score?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface LlmRagContext {
  query: string;
  chunks: LlmRetrievalItem[];
  usedAt: string;
}

export interface LlmTokenUsage {
  prompt?: number;
  completion?: number;
  total?: number;
}

export interface LlmModelInfo {
  model: string;
  params?: Record<string, number | string | boolean>;
  tokens?: LlmTokenUsage;
  latencyMs?: number;
}

// PUBLIC_INTERFACE
export interface LlmChatCompletionResponse {
  /** Model generated assistant content. */
  content: string;
  /** Optional retrieval context used for generation. */
  context?: LlmRagContext;
  /** Model call metadata. */
  llm?: LlmModelInfo;
  /** Optional MCP steps from backend. */
  protocol?: Array<{
    id: string;
    at: string;
    type: string;
    actor?: { id: string; name: string; icon?: string };
    input?: { text?: string; fields?: Record<string, unknown> };
    output?: { text?: string; fields?: Record<string, unknown> };
    retrieval?: { query: string; items: LlmRetrievalItem[] };
    contextWindow?: Array<{ id: string; type: string; text: string; tokens?: number; origin?: string }>;
    model?: LlmModelInfo;
    note?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class LlmClientService {
  private http = inject(HttpClient);

  // PUBLIC_INTERFACE
  isConfigured(): boolean {
    /** Returns true if API URL is available for network calls. */
    return !!environment.LLM_API_URL;
  }

  // PUBLIC_INTERFACE
  chatCompletions(req: LlmChatCompletionRequest): Observable<LlmChatCompletionResponse> {
    /**
     * Sends a chat-completions request to the backend.
     * Throws if not configured.
     */
    if (!this.isConfigured()) {
      return throwError(() => new Error('LLM backend not configured'));
    }

    const url = this.composeUrl(environment.LLM_API_URL, environment.LLM_CHAT_COMPLETIONS_PATH);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(environment.LLM_API_KEY ? { Authorization: `Bearer ${environment.LLM_API_KEY}` } : {}),
    });

    return this.http
      .post<LlmChatCompletionResponse>(url, req, { headers })
      .pipe(
        timeout({ each: environment.LLM_TIMEOUT_MS }),
        map((res) => {
          // Basic normalization to ensure required fields exist
          const normTokens = (t: any) =>
            t
              ? {
                  prompt: this.numOrUndef(t.prompt),
                  completion: this.numOrUndef(t.completion),
                  total: this.numOrUndef(t.total),
                }
              : undefined;

          const normParams = (p: any) => {
            if (!p || typeof p !== 'object') return undefined;
            const out: Record<string, number> = {};
            for (const k of Object.keys(p)) {
              const n = Number((p as any)[k]);
              if (isFinite(n) && !isNaN(n)) out[k] = n;
            }
            return Object.keys(out).length ? out : undefined;
          };

          const llm = res?.llm
            ? {
                model: res.llm.model,
                params: res.llm.params, // keep raw here; ChatService further normalizes to app type
                tokens: res.llm.tokens ? (res.llm.tokens as any) : undefined,
                latencyMs: res.llm.latencyMs as any,
              }
            : undefined;

          return {
            content: res?.content ?? '',
            context: res?.context,
            llm,
            protocol: res?.protocol ?? [],
          } as LlmChatCompletionResponse;
        })
      );
  }

  private numOrUndef(v: any): number | undefined {
    const n = Number(v);
    return isFinite(n) && !isNaN(n) ? n : undefined;
  }

  private composeUrl(base: string, path: string): string {
    const b = base.replace(/\/+$/, '');
    const p = path.replace(/^\/+/, '');
    return `${b}/${p}`;
  }
}
