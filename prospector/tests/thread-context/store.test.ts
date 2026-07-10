import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';

import type { ModelMessage } from 'ai';

import { type ConversationStore, createConversationStore } from '../../thread-context/store.ts';

function userMessage(content: string): ModelMessage {
  return { role: 'user', content };
}

describe('createConversationStore', () => {
  let store: ConversationStore;

  beforeEach(() => {
    store = createConversationStore({ ttlSeconds: 60, maxEntries: 3 });
  });

  it('returns null for unknown threads', () => {
    assert.strictEqual(store.getMessages('C1', '1.0'), null);
  });

  it('stores and retrieves messages per thread', () => {
    const messages = [userMessage('hello')];
    store.setMessages('C1', '1.0', messages);
    assert.deepStrictEqual(store.getMessages('C1', '1.0'), messages);
    assert.strictEqual(store.getMessages('C1', '2.0'), null);
  });

  it('expires entries after the TTL', () => {
    const now = Date.now();
    const clock = mock.method(Date, 'now', () => now);
    store.setMessages('C1', '1.0', [userMessage('hello')]);

    clock.mock.mockImplementation(() => now + 61_000);
    assert.strictEqual(store.getMessages('C1', '1.0'), null);
    clock.mock.restore();
  });

  it('evicts the oldest entries beyond maxEntries', () => {
    const now = Date.now();
    const clock = mock.method(Date, 'now', () => now);

    for (const [index, ts] of ['1.0', '2.0', '3.0', '4.0'].entries()) {
      clock.mock.mockImplementation(() => now + index * 1000);
      store.setMessages('C1', ts, [userMessage(`message ${ts}`)]);
    }

    assert.strictEqual(store.getMessages('C1', '1.0'), null);
    assert.notStrictEqual(store.getMessages('C1', '4.0'), null);
    clock.mock.restore();
  });
});
