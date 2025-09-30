import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, map, tap } from 'rxjs';
import { AgentSummary, Conversation, Message, RagChunk, RagContext } from '../models/chat.models';

/**
 * ChatService manages conversations, messages, agent states, and mock RAG retrieval.
 * In a real integration, replace the mock flows with HTTP/WebSocket calls.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {

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
     * Sends a user message and simulates agent pipeline:
     * 1) Planner thinks
     * 2) Researcher retrieves RAG
     * 3) Writer responds using retrieved context
     */
    const convId = this.activeConversationId$.value;
    const agentId = this.activeAgentId$.value;

    const userMsg: Message = {
      id: this.uuid(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    this.pushMessage(convId, userMsg);

    this.setAgentState('planner', 'thinking', 'Analyzing task...');
    this.setAgentState('researcher', 'idle');
    this.setAgentState('writer', 'idle');

    // Step 1: Planner "thinking"
    return of(true).pipe(
      delay(600),
      tap(() => {
        this.setAgentState('planner', 'retrieving', 'Scoping and delegating...');
      }),
      delay(500),
      tap(() => {
        // Step 2: Researcher retrieves
        this.setAgentState('planner', 'responding', 'Coordinating agents...');
        this.setAgentState('researcher', 'retrieving', 'Searching knowledge base...');
      }),
      delay(900),
      tap(() => {
        const chunks = this.mockRag(content);
        const rag: RagContext = {
          query: content,
          chunks,
          usedAt: new Date().toISOString()
        };

        this.setAgentState('researcher', 'responding', 'Ranking and summarizing...');

        // Step 3: Writer uses context to compose reply
        this.setAgentState('writer', 'thinking', 'Drafting response...');
        // Use globalThis.setTimeout if available in this environment
        const safeSetTimeout = (fn: () => void, ms: number) => {
          try {
            if (typeof globalThis !== 'undefined' && typeof (globalThis as any).setTimeout === 'function') {
              return (globalThis as any).setTimeout(fn, ms);
            }
          } catch { /* ignore */ }
          return undefined as unknown as number;
        };

        safeSetTimeout(() => {
          this.setAgentState('planner', 'idle');
          this.setAgentState('researcher', 'idle');
          this.setAgentState('writer', 'responding', 'Finalizing response...');
          const reply: Message = {
            id: this.uuid(),
            role: 'agent',
            content: this.generateReply(content, rag),
            timestamp: new Date().toISOString(),
            agentId,
            context: rag
          };
          this.pushMessage(convId, reply);
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
    const base: RagChunk[] = [
      { id: this.uuid(), source: 'docs/guide.md', title: 'RAG Overview', snippet: 'RAG combines retrieval with generation to ground responses.', score: 0.92, url: '#' },
      { id: this.uuid(), source: 'blog/agents', title: 'Agent Collaboration', snippet: 'Planner, Researcher, and Writer coordinate to answer complex queries.', score: 0.88, url: '#' },
      { id: this.uuid(), source: 'kb/context', title: 'Context Windows', snippet: 'Efficient context packing improves factual grounding.', score: 0.81, url: '#' },
    ];
    return base.map((c, i) => ({ ...c, snippet: `${c.snippet} [q:${query.slice(0, 24)}...]` , score: c.score ? +(c.score - i * 0.03).toFixed(2) : undefined }));
  }

  private generateReply(userText: string, rag: RagContext): string {
    const top = rag.chunks.slice(0, 2).map(c => `- ${c.title ?? c.source}: ${c.snippet}`).join('\n');
    return `Here's a synthesized answer based on retrieved context.\n\nKey evidence:\n${top}\n\nIn summary, ${userText.trim()} can be approached by combining planning, targeted retrieval, and clear synthesis aligned with your goals.`;
  }
}
