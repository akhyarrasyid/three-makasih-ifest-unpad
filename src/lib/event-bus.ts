import type { SimEvent, SimEventType } from "@/types/domain";

type Handler = (event: SimEvent) => void;

/**
 * Lightweight typed event bus used by the real-time simulation layer.
 * Consumers subscribe to specific event types or "*" for all events.
 */
class EventBus {
  private handlers = new Map<SimEventType | "*", Set<Handler>>();

  on(type: SimEventType | "*", handler: Handler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(event: SimEvent) {
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get("*")?.forEach((h) => h(event));
  }
}

export const eventBus = new EventBus();
