import type { ModelMessage } from 'ai';

interface StoreEntry {
  messages: ModelMessage[];
  timestamp: number;
}

export interface ConversationStore {
  getMessages: (channelId: string, threadTs: string) => ModelMessage[] | null;
  setMessages: (channelId: string, threadTs: string, messages: ModelMessage[]) => void;
}

/**
 * Create an in-memory conversation store with TTL-based cleanup and a max
 * entry limit. The Vercel AI SDK is stateless, so full message history is
 * kept per thread, keyed by `${channelId}:${threadTs}`.
 */
export function createConversationStore({
  ttlSeconds = 86400,
  maxEntries = 1000,
}: {
  ttlSeconds?: number;
  maxEntries?: number;
} = {}): ConversationStore {
  const store = new Map<string, StoreEntry>();

  function cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.timestamp > ttlSeconds * 1000) {
        store.delete(key);
      }
    }
    if (store.size > maxEntries) {
      const sorted = [...store.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(0, store.size - maxEntries);
      for (const [key] of toRemove) {
        store.delete(key);
      }
    }
  }

  function getMessages(channelId: string, threadTs: string): ModelMessage[] | null {
    const key = `${channelId}:${threadTs}`;
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlSeconds * 1000) {
      store.delete(key);
      return null;
    }
    return entry.messages;
  }

  function setMessages(channelId: string, threadTs: string, messages: ModelMessage[]): void {
    const key = `${channelId}:${threadTs}`;
    store.set(key, { messages, timestamp: Date.now() });
    cleanup();
  }

  return { getMessages, setMessages };
}
