import * as https from 'https';
import { LLMProvider, ChatMessage, StreamCallback } from '../types';

/**
 * Provider for OpenAI's Chat Completions API.
 * Docs: https://platform.openai.com/docs/api-reference/chat
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';

  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o'
  ) {}

  async validateConfig(): Promise<{ ok: boolean; message?: string }> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      return {
        ok: false,
        message: 'OpenAI API key is missing. Set it in PairMind settings.',
      };
    }
    return { ok: true };
  }

  async streamChat(messages: ChatMessage[], onChunk: StreamCallback): Promise<void> {
    const check = await this.validateConfig();
    if (!check.ok) {
      throw new Error(check.message);
    }

    const body = JSON.stringify({
      model: this.model,
      messages,
      stream: true,
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          // Non-2xx: collect the error body instead of trying to stream it.
          if (res.statusCode && res.statusCode >= 400) {
            let errorData = '';
            res.on('data', (chunk) => (errorData += chunk));
            res.on('end', () => {
              reject(new Error(this.formatApiError(res.statusCode!, errorData)));
            });
            return;
          }

          // OpenAI streams SSE: lines like "data: {...}" ending in "data: [DONE]"
          let buffer = '';
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;

              const payload = trimmed.replace(/^data:\s*/, '');
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) onChunk(delta);
              } catch {
                // Ignore partial/malformed SSE fragments; next chunk completes them.
              }
            }
          });

          res.on('end', () => resolve());
          res.on('error', (err) => reject(err));
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Failed to reach OpenAI: ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  private formatApiError(statusCode: number, rawBody: string): string {
    try {
      const parsed = JSON.parse(rawBody);
      const msg = parsed.error?.message ?? 'Unknown error';
      if (statusCode === 401) return `OpenAI: Invalid API key.`;
      if (statusCode === 429) return `OpenAI: Rate limit or quota exceeded.`;
      return `OpenAI error (${statusCode}): ${msg}`;
    } catch {
      return `OpenAI error (${statusCode})`;
    }
  }
}