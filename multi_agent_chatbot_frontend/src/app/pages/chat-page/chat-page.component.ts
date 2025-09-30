import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AgentSummary, Conversation, Message } from '../../models/chat.models';
import { ModelContextService } from '../../services/model-context.service';
import { ProtocolStep } from '../../models/context.models';

/**
 * ChatPageComponent composes the main layout:
 * - Sidebar: agent selection + conversation list
 * - Main: chat history + composer
 * - Right: context panels and agent states
 */
@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css'
})
export class ChatPageComponent {
  agents: AgentSummary[] = [];
  conversations: Conversation[] = [];
  activeConversation?: Conversation;
  activeAgent?: AgentSummary;

  draft = signal<string>('');
  sending = signal<boolean>(false);

  private mcp = inject(ModelContextService);

  constructor(private chat: ChatService) {
    this.agents = this.chat.getAgents();
    this.chat.watchConversations().subscribe(cs => {
      this.conversations = cs;
      if (!this.activeConversation) {
        this.activeConversation = cs.find(c => c.id) as Conversation;
      } else {
        this.activeConversation = cs.find(c => c.id === this.activeConversation?.id);
      }
    });
    this.chat.watchActiveAgent().subscribe(a => this.activeAgent = a);
  }

  // PUBLIC_INTERFACE
  trackById(_: number, item: { id: string }): string {
    /** TrackBy function for ngFor lists. */
    return item.id;
  }

  // PUBLIC_INTERFACE
  selectAgent(a: AgentSummary) {
    /** Select the active agent for subsequent messages. */
    this.chat.setActiveAgent(a.id);
    this.activeAgent = a;
  }

  // PUBLIC_INTERFACE
  newChat() {
    /** Create a new conversation and make it active. */
    const id = this.chat.newConversation('New Chat');
    this.activeConversation = this.conversations.find(c => c.id === id);
  }

  // PUBLIC_INTERFACE
  send() {
    /** Sends the drafted message and triggers agent pipeline. */
    const text = this.draft().trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    this.chat.sendMessage(text).subscribe({
      next: () => {
        this.draft.set('');
      },
      complete: () => {
        this.sending.set(false);
      },
      error: () => {
        this.sending.set(false);
      }
    });
  }

  // PUBLIC_INTERFACE
  onKeydown(e: any) {
    /** Allow Ctrl/Cmd+Enter to send message. */
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault?.();
      this.send();
    }
  }

  asUser(m: Message) { return m.role === 'user'; }
  asAgent(m: Message) { return m.role === 'agent'; }

  // PUBLIC_INTERFACE
  getProtocolSteps(turnId: string): ProtocolStep[] {
    /** Returns protocol steps for a given turn id (snapshot). */
    return this.mcp.get(turnId)?.steps ?? [];
  }

  // PUBLIC_INTERFACE
  getLastProtocolTurnId(): string | undefined {
    /**
     * Safely returns the protocolTurnId of the last message in the active conversation.
     * This avoids complex template expressions and parser issues.
     */
    const msgs = this.activeConversation?.messages;
    if (!msgs || msgs.length === 0) return undefined;
    const last = msgs[msgs.length - 1];
    return (last as any)?.protocolTurnId;
  }
}
