import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, map, tap, catchError, switchMap } from 'rxjs';
import { AgentSummary, Conversation, Message, RagChunk, RagContext } from '../models/chat.models';
import { ModelContextService } from './model-context.service';
import { ContextWindowItem, ModelCallInfo, ProtocolActor, ProtocolStep } from '../models/context.models';
import { LlmClientService, LlmChatCompletionRequest, LlmChatCompletionResponse } from './llm-client.service';

/**
 * ChatService manages conversations, messages, agent states, and RAG/LLM integration.
 * It uses a real backend via LlmClientService when configured. If not, it falls back to the previous mock pipeline.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {

  constructor(private mcp: ModelContextService) {}

  private llm = inject(LlmClientService);

  private uuid(): string {
    // Prefer Web Crypto UUID if available
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
        return (globalThis as any).crypto.randomUUID();
      }
    } catch {
      // ignore
    }
    // Fallback simple UUID v4-ish
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private agents: AgentSummary[] = [
    {
      id: 'planner',
      name: 'Planner',
      description: 'Decomposes tasks and orchestrates sub-agents.',
      icon: '🧭',
      expertise: ['Planning', 'Decomposition', 'Coordination'],
      state: { status: 'idle' }
    },
    {
      id: 'researcher',
      name: 'Researcher',
      description: 'Finds and ranks relevant information from knowledge sources.',
      icon: '🔎',
      expertise: ['RAG', 'Ranking', 'Summarization'],
      state: { status: 'idle' }
    },
    {
      id: 'writer',
      name: 'Writer',
      description: 'Crafts articulate, context-aware responses.',
      icon: '✍️',
      expertise: ['Writing', 'Synthesis', 'Clarity'],
      state: { status: 'idle' }
    }
  ];

  private conversations$ = new BehaviorSubject<Conversation[]>([
    {
      id: 'conv-1',
      title: 'Welcome',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentId: 'planner',
      messages: [
        {
          id: this.uuid(),
          role: 'agent',
          content: 'Hello! I am your multi-agent assistant. How can we help today?',
          timestamp: new Date().toISOString(),
          agentId: 'planner'
        }
      ]
    }
  ]);

  private activeConversationId$ = new BehaviorSubject<string>('conv-1');
  private activeAgentId$ = new BehaviorSubject<string>('planner');

  // PUBLIC_INTERFACE
  getAgents(): AgentSummary[] {
    /** Returns the list of available agents. */
    return this.agents;
  }

  // PUBLIC_INTERFACE
  watchConversations(): Observable<Conversation[]> {
    /** Observe the list of conversations. */
    return this.conversations$.asObservable();
  }

  // PUBLIC_INTERFACE
  watchActiveConversation(): Observable<Conversation | undefined> {
    /** Observe the currently active conversation. */
    return this.conversations$.pipe(
      map(list => list.find(c => c.id === this.activeConversationId$.value))
    );
  }

  // PUBLIC_INTERFACE
  watchActiveAgent(): Observable<AgentSummary | undefined> {
    /** Observe the currently selected agent. */
    return of(this.agents.find(a => a.id === this.activeAgentId$.value));
  }

  // PUBLIC_INTERFACE
  setActiveAgent(agentId: string): void {
    /** Select an agent to handle subsequent messages. */
    this.activeAgentId$.next(agentId);
    const convs = this.conversations$.value.map(c => {
      if (c.id === this.activeConversationId$.value) {
        return { ...c, agentId, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    this.conversations$.next(convs);
  }

  // PUBLIC_INTERFACE
  newConversation(title = 'New Chat'): string {
    /** Start a new conversation with the current agent. */
    const id = this.uuid();
    const now = new Date().toISOString();
    const conv: Conversation = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      agentId: this.activeAgentId$.value,
      messages: []
    };
    this.conversations$.next([conv, ...this.conversations$.value]);
    this.activeConversationId$.next(id);
    return id;
  }

  // PUBLIC_INTERFACE
  sendMessage(content: string): Observable<Message> {
    /**
     * Sends a user message.
     * If backend is configured, dispatch to LLM API with full context.
     * Otherwise, use the legacy mock pipeline to simulate RAG + LLM.
     */
    const convId = this.activeConversationId$.value;
    const selectedAgentId = this.activeAgentId$.value || 'writer';

    // Normalize/sanitize the user content
    const raw = (content ?? '').toString();
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    const safeContent = cleaned.slice(0, 4000);

    const turnId = this.uuid();
    this.mcp.addProtocol(turnId);

    const userMsg: Message = {
      id: this.uuid(),
      role: 'user',
      content: safeContent,
      timestamp: new Date().toISOString(),
      protocolTurnId: turnId
    };
    this.pushMessage(convId, userMsg);

    if (!this.llm.isConfigured()) {
      // Backend not configured -> use mock path
      return this.sendMessageMockPath(convId, selectedAgentId, safeContent, turnId, userMsg);
    }

    // Backend configured -> prepare request
    const planner: ProtocolActor = { id: 'planner', name: 'Planner', icon: '🧭' };
    const start = Date.now();
    this.setAgentState('planner', 'thinking', 'Contacting backend…');

    const req: LlmChatCompletionRequest = {
      messages: [
        { role: 'system', content: 'You are a helpful, precise assistant. Cite evidence concisely.' },
        { role: 'user', content: safeContent },
      ],
      agentId: selectedAgentId,
      params: { temperature: 0.3, max_tokens: 512, top_p: 1.0 },
      rag: { enable: true, k: 5 }
    };

    // Log initial plan in MCP
    this.mcp.appendStep(turnId, {
      id: this.uuid(),
      at: new Date().toISOString(),
      type: 'plan',
      actor: planner,
      input: { text: safeContent },
      output: { text: 'Send to LLM backend with optional RAG.' },
      note: 'Frontend delegated retrieval and generation to backend.'
    });

    return of(null).pipe(
      switchMap(() => this.llm.chatCompletions(req)),
      tap((res) => {
        // Render backend-provided MCP, if any
        this.applyBackendProtocol(turnId, res);

        // Compose message from backend result
        // Normalize backend llm metadata to match frontend type expectations
        const normLlm = res.llm
          ? {
              model: res.llm.model,
              params: this.toNumberRecord(res.llm.params),
              tokens: {
                prompt: this.toNumberOrUndefined((res.llm.tokens as any)?.prompt),
                completion: this.toNumberOrUndefined((res.llm.tokens as any)?.completion),
                total: this.toNumberOrUndefined((res.llm.tokens as any)?.total),
              },
              latencyMs: this.toNumberOrUndefined(res.llm.latencyMs),
            }
          : undefined;

        const reply: Message = {
          id: this.uuid(),
          role: 'agent',
          content: res.content || '(no content)',
          timestamp: new Date().toISOString(),
          agentId: selectedAgentId,
          context: res.context as RagContext | undefined,
          llm: normLlm,
          protocolTurnId: turnId,
        };
        this.pushMessage(convId, reply);
      }),
      tap(() => {
        // Update agent states
        this.setAgentState('planner', 'idle');
      }),
      map(() => userMsg),
      catchError((err) => {
        // If backend fails, gracefully fall back to mock path while indicating error in MCP
        this.mcp.appendStep(turnId, {
          id: this.uuid(),
          at: new Date().toISOString(),
          type: 'error',
          actor: { id: 'backend', name: 'Backend', icon: '🛠️' },
          note: `Backend error: ${err?.message || String(err)}`
        });
        return this.sendMessageMockPath(convId, selectedAgentId, safeContent, turnId, userMsg);
      })
    );
  }

  private applyBackendProtocol(turnId: string, res: LlmChatCompletionResponse) {
    // Convert backend protocol (if present) into our MCP structure
    const steps = (res.protocol || []) as any[];
    for (const s of steps) {
      const step: ProtocolStep = {
        id: s.id || this.uuid(),
        at: s.at || new Date().toISOString(),
        type: (s.type as any) || 'plan',
        actor: s.actor || { id: 'backend', name: 'Backend', icon: '🛠️' },
        input: s.input,
        output: s.output,
        retrieval: s.retrieval,
        contextWindow: s.contextWindow,
        model: s.model,
        note: s.note,
      };
      this.mcp.appendStep(turnId, step);
    }
  }

  private toNumberOrUndefined(v: any): number | undefined {
    const n = Number(v);
    return isFinite(n) && !isNaN(n) ? n : undefined;
  }

  private toNumberRecord(
    obj: Record<string, number | string | boolean | undefined> | undefined
  ): Record<string, number> | undefined {
    if (!obj) return undefined;
    const out: Record<string, number> = {};
    for (const k of Object.keys(obj)) {
      const val = (obj as any)[k];
      const n = Number(val);
      if (isFinite(n) && !isNaN(n)) {
        out[k] = n;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }

  private sendMessageMockPath(
    convId: string,
    selectedAgentId: string,
    safeContent: string,
    turnId: string,
    userMsg: Message
  ): Observable<Message> {
    const planner: ProtocolActor = { id: 'planner', name: 'Planner', icon: '🧭' };
    const researcher: ProtocolActor = { id: 'researcher', name: 'Researcher', icon: '🔎' };
    const writer: ProtocolActor = { id: 'writer', name: 'Writer', icon: '✍️' };

    this.setAgentState('planner', 'thinking', 'Analyzing task…');

    const reformulated = this.rewriteQueryForRetrieval(safeContent);
    this.mcp.appendStep(turnId, {
      id: this.uuid(),
      at: new Date().toISOString(),
      type: 'plan',
      actor: planner,
      input: { text: safeContent, fields: { originalLength: safeContent.length } },
      output: { text: `Plan: retrieve • pack • generate. Reformulated query: "${reformulated}"` },
      note: 'Planner refined the query to improve retrieval.'
    });

    return of(true).pipe(
      delay(400),
      tap(() => {
        this.setAgentState('planner', 'retrieving', 'Scoping and delegating…');
        this.mcp.appendStep(turnId, {
          id: this.uuid(),
          at: new Date().toISOString(),
          type: 'route',
          actor: planner,
          output: { text: 'Delegate retrieval to Researcher and writing to Writer.' },
          note: 'Planner routed subtasks to agents.'
        });
      }),
      delay(400),
      tap(() => {
        // Retrieval
        this.setAgentState('researcher', 'retrieving', 'Searching knowledge base…');
        const chunksRaw = this.mockRag(reformulated || safeContent);

        // Deduplicate by title/source and re-rank by score
        const seen = new Set<string>();
        const chunks = chunksRaw
          .filter(c => {
            const key = (c.title || c.source || '').toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 5);

        const nowISO = new Date().toISOString();
        this.mcp.appendStep(turnId, {
          id: this.uuid(),
          at: nowISO,
          type: 'retrieve',
          actor: researcher,
          input: { text: reformulated || safeContent },
          retrieval: {
            query: reformulated || safeContent,
            items: chunks.map(c => ({
              id: c.id,
              source: c.source,
              title: c.title,
              snippet: c.snippet,
              score: c.score,
              url: c.url
            }))
          },
          note: `Retrieved ${chunks.length} unique items after deduplication and ranking.`
        });

        const rag: RagContext = {
          query: reformulated || safeContent,
          chunks,
          usedAt: nowISO
        };

        // Context packing
        this.setAgentState('researcher', 'responding', 'Ranking and summarizing…');
        const contextItems: ContextWindowItem[] = [
          { id: this.uuid(), type: 'system', text: 'You are a helpful, precise assistant. Cite evidence concisely.' , tokens: 16, origin: 'system' },
          { id: this.uuid(), type: 'history', text: `User: ${safeContent}`, tokens: Math.min(24 + Math.floor(safeContent.length / 3), 256), origin: 'user' },
          ...rag.chunks.slice(0, 3).map(ch => ({
            id: ch.id,
            type: 'retrieval' as const,
            text: `[${ch.title ?? ch.source}] ${ch.snippet}`,
            origin: ch.source,
            tokens: Math.min(60 + Math.floor((ch.snippet || '').length / 4), 200)
          }))
        ];

        this.mcp.appendStep(turnId, {
          id: this.uuid(),
          at: new Date().toISOString(),
          type: 'pack',
          actor: planner,
          contextWindow: contextItems,
          note: 'Packed system guidance, user input, and top retrievals (3) with token estimates.'
        });

        // Generation
        this.setAgentState('writer', 'thinking', 'Drafting response…');
        const start = Date.now();
        const safeSetTimeout = (fn: () => void, ms: number) => {
          try {
            if (typeof globalThis !== 'undefined' && typeof (globalThis as any).setTimeout === 'function') {
              return (globalThis as any).setTimeout(fn, ms);
            }
          } catch {
            // ignore
          }
          return undefined as unknown as number;
        };

        safeSetTimeout(() => {
          this.setAgentState('planner', 'idle');
          this.setAgentState('researcher', 'idle');

          const latency = Date.now() - start;
          const promptTokens = contextItems.reduce((acc, it) => acc + (it.tokens ?? 50), 0);
          const llmInfo: ModelCallInfo = {
            model: 'mock-gpt-4o-mini',
            params: { temperature: 0.3, max_tokens: 512, top_p: 1.0 },
            latencyMs: latency,
            tokens: {
              prompt: promptTokens,
              completion: 160,
              total: promptTokens + 160
            }
          };

          this.setAgentState('writer', 'responding', 'Finalizing response…');
          const replyText = this.generateReplyTailored(safeContent, rag, selectedAgentId);
          const reply: Message = {
            id: this.uuid(),
            role: 'agent',
            content: replyText,
            timestamp: new Date().toISOString(),
            agentId: selectedAgentId,
            context: rag,
            llm: llmInfo,
            protocolTurnId: turnId
          };
          this.pushMessage(convId, reply);

          this.mcp.appendStep(turnId, {
            id: this.uuid(),
            at: new Date().toISOString(),
            type: 'generate',
            actor: { id: 'writer', name: 'Writer', icon: '✍️' },
            input: { text: safeContent, fields: { packedItems: contextItems.length } },
            output: { text: reply.content },
            model: llmInfo,
            note: 'LLM produced grounded response informed by retrieval.'
          });

          this.setAgentState('writer', 'idle');
        }, 900);
      }),
      map(() => userMsg)
    );
  }

  private pushMessage(convId: string, message: Message) {
    const list = this.conversations$.value.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        messages: [...c.messages, message],
        updatedAt: new Date().toISOString()
      };
    });
    this.conversations$.next(list);
  }

  private setAgentState(agentId: string, status: AgentSummary['state']['status'], note?: string) {
    this.agents = this.agents.map(a => a.id === agentId ? ({ ...a, state: { status, note } }) : a);
  }

  private mockRag(query: string): RagChunk[] {
    // Simple query-aware mock: add basic synthetic signals and query echo for grounding.
    const q = (query || '').trim();
    const base: RagChunk[] = [
      { id: this.uuid(), source: 'docs/guide.md', title: 'RAG Overview', snippet: 'RAG combines retrieval with generation to ground responses.', score: 0.92, url: '#' },
      { id: this.uuid(), source: 'blog/agents', title: 'Agent Collaboration', snippet: 'Planner, Researcher, and Writer coordinate to answer complex queries.', score: 0.88, url: '#' },
      { id: this.uuid(), source: 'kb/context', title: 'Context Windows', snippet: 'Efficient context packing improves factual grounding.', score: 0.81, url: '#' },
      { id: this.uuid(), source: 'kb/evaluation', title: 'Answer Quality', snippet: 'Grounded responses cite evidence and include caveats when needed.', score: 0.77, url: '#' }
    ];
    const echoed = base.map((c, i) => ({
      ...c,
      snippet: `${c.snippet} [q:${q.slice(0, 48)}${q.length > 48 ? '…' : ''}]`,
      score: c.score ? +(c.score - i * 0.025).toFixed(2) : undefined
    }));
    return echoed;
  }

  private generateReply(userText: string, rag: RagContext): string {
    // legacy path retained for compatibility; now call tailored generator
    return this.generateReplyTailored(userText, rag, 'writer');
  }

  private generateReplyTailored(userText: string, rag: RagContext, agentId: string): string {
    const ask = (userText || '').trim();
    const bullets = rag.chunks.slice(0, 3).map(c => `• ${c.title ?? c.source}: ${c.snippet}`).join('\n');
    const preface =
      agentId === 'planner'
        ? 'Plan of action'
        : agentId === 'researcher'
          ? 'Evidence-based findings'
          : 'Synthesis';

    const styleHint =
      agentId === 'planner'
        ? 'I will outline steps and responsibilities.'
        : agentId === 'researcher'
          ? 'I will emphasize sources and confidence.'
          : 'I will keep the explanation concise and practical.';

    const caveat = 'If additional precision is required, please provide constraints, expected format, or target audience.';
    return `${preface} for your request: "${ask}"

Key evidence:
${bullets || '• (no retrieved evidence available)'}

${styleHint}
Answer:
Based on the retrieved context, here is a grounded response tailored to your query. Where appropriate, I cite evidence from the items above and avoid speculation.

${caveat}`;
  }

  private rewriteQueryForRetrieval(text: string): string {
    // Very simple heuristic: remove pleasantries and keep keywords
    const cleaned = (text || '').toLowerCase()
      .replace(/\b(please|kindly|can you|could you|would you|thanks|thank you)\b/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Keep top 10 tokens as a "query"
    return cleaned.split(' ').slice(0, 10).join(' ');
  }
}
