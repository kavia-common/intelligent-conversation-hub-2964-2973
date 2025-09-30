import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { ModelContextService } from '../../services/model-context.service';
import { Conversation, Message } from '../../models/chat.models';
import { ProtocolStep } from '../../models/context.models';

/**
 * Minimal Q&A page:
 * - One question input (single turn; no history UI)
 * - Answer display
 * - RAG evidence list for that answer
 * - Compact Model Context Protocol panel for the asked question
 */
@Component({
  selector: 'app-qa-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qa-page.component.html',
  styleUrl: './qa-page.component.css'
})
export class QaPageComponent {
  private chat = inject(ChatService);
  private mcp = inject(ModelContextService);

  question = signal<string>('');
  sending = signal<boolean>(false);

  // Holds the last asked message ids to show its answer and protocol
  private lastTurnId?: string;
  answerMsg = signal<Message | undefined>(undefined);

  // PUBLIC_INTERFACE
  ask(): void {
    /** Send the current question and render answer, evidence, and MCP steps. */
    const q = this.question().trim();
    if (!q || this.sending()) return;

    this.sending.set(true);
    // Use ChatService to leverage backend/mocks and protocol construction
    this.chat.sendMessage(q).subscribe({
      next: (userMsg) => {
        // Keep turn id for MCP
        this.lastTurnId = userMsg.protocolTurnId;
        // Find assistant reply appended to active conversation
        this.resolveLatestAssistantReply();
        // Clear input
        this.question.set('');
      },
      complete: () => this.sending.set(false),
      error: () => this.sending.set(false),
    });
  }

  // PUBLIC_INTERFACE
  onKeydown(e: any): void {
    /** Allow Ctrl/Cmd+Enter to send. */
    const ctrl = !!(e && (e.ctrlKey || e.metaKey));
    const key = e?.key;
    if (ctrl && key === 'Enter') {
      e.preventDefault?.();
      this.ask();
    }
  }

  // PUBLIC_INTERFACE
  getProtocolSteps(): ProtocolStep[] {
    /** Return protocol steps for the last asked question. */
    if (!this.lastTurnId) return [];
    return this.mcp.get(this.lastTurnId)?.steps ?? [];
  }

  private resolveLatestAssistantReply(): void {
    // Pull current active conversation and get the last agent message
    let activeConv: Conversation | undefined;
    this.chat.watchActiveConversation().subscribe((conv) => (activeConv = conv)).unsubscribe();
    if (!activeConv) {
      this.answerMsg.set(undefined);
      return;
    }
    // Find the last agent message (the answer we just got)
    const lastAgent = [...activeConv.messages].reverse().find(m => m.role === 'agent');
    this.answerMsg.set(lastAgent);
  }
}
