import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ModelContextProtocol, ProtocolStep } from '../models/context.models';

/**
 * ModelContextService tracks the Model Context Protocol (MCP) steps for each turn.
 * This allows the UI to render a timeline of how context was assembled and how the LLM was called.
 */
@Injectable({ providedIn: 'root' })
export class ModelContextService {
  private protocols$ = new BehaviorSubject<Record<string, ModelContextProtocol>>({});

  // PUBLIC_INTERFACE
  addProtocol(turnId: string): void {
    /** Create an empty protocol timeline for a turn if not exists. */
    const curr = this.protocols$.value;
    if (!curr[turnId]) {
      curr[turnId] = { turnId, steps: [] };
      this.protocols$.next({ ...curr });
    }
  }

  // PUBLIC_INTERFACE
  appendStep(turnId: string, step: ProtocolStep): void {
    /** Append a step to a turn protocol timeline. */
    const curr = this.protocols$.value;
    if (!curr[turnId]) this.addProtocol(turnId);
    curr[turnId].steps = [...curr[turnId].steps, step];
    this.protocols$.next({ ...curr });
  }

  // PUBLIC_INTERFACE
  watch(turnId: string): Observable<ModelContextProtocol | undefined> {
    /** Observe the protocol timeline for a given turn. */
    return new Observable((subscriber) => {
      const sub = this.protocols$.subscribe(map => {
        subscriber.next(map[turnId]);
      });
      return () => sub.unsubscribe();
    });
  }

  // PUBLIC_INTERFACE
  get(turnId: string): ModelContextProtocol | undefined {
    /** Get protocol snapshot for a given turn. */
    return this.protocols$.value[turnId];
  }
}
