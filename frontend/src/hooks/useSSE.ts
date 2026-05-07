import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { SearchTask } from '../types';

interface UseSSEResult {
  messages: SearchTask[];
  result: SearchTask | null;
  isLoading: boolean;
  error: string | null;
}

const TERMINAL: ReadonlyArray<string> = ['success', 'failure'];

/**
 * EventSource-style hook implemented with fetch + ReadableStream so we can
 * send the JWT in an Authorization header (the backend SSE endpoint requires it).
 */
export function useSSE(url: string | null): UseSSEResult {
  const [messages, setMessages] = useState<SearchTask[]>([]);
  const [result, setResult] = useState<SearchTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) return;

    setMessages([]);
    setResult(null);
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const token = useAuthStore.getState().token;

    void (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let separatorIndex: number;
          while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const dataLines = rawEvent
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.replace(/^data:\s?/, ''));
            if (dataLines.length === 0) continue;

            const dataStr = dataLines.join('\n');
            try {
              const parsed = JSON.parse(dataStr) as SearchTask;
              setMessages((prev) => [...prev, parsed]);
              if (parsed.status && TERMINAL.includes(parsed.status)) {
                setResult(parsed);
                setIsLoading(false);
                if (parsed.status === 'failure') {
                  setError(parsed.error ?? 'failure');
                }
                return;
              }
            } catch {
              // ignore non-JSON keepalives
            }
          }
        }
        setIsLoading(false);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setIsLoading(false);
      }
    })();

    return () => {
      controller.abort();
      abortRef.current = null;
      setIsLoading(false);
    };
  }, [url]);

  return { messages, result, isLoading, error };
}
