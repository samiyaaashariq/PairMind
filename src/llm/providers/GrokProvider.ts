import * as https from 'https';
import { LLMProvider, ChatMessage, StreamCallback } from '../types';

/**
 * Provider for xAI's Grok API.
 * Grok's API is intentionally OpenAI-compatible, so this closely mirrors
 * OpenAIProvider — same SSE streaming format, different host/model defaults.
 * Docs: https://docs.x.ai/docs/api-reference
 */
export class GrokProvider implements LLMProvider {
  readonly name = 'Grok';

  constructor(
    private apiKey: string,
    private model: string = 'grok-2-latest'
  ) {}

  async validateConfig(): Promise<{ ok: boolean; message?: string }> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      return {
        ok: false,
        message: 'Grok API key is missing. Set it in PairMind settings.',
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
          hostname: 'api.x.ai',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            let errorData = '';
            res.on('data', (chunk) => (errorData += chunk));
            res.on('end', () => {
              reject(new Error(this.formatApiError(res.statusCode!, errorData)));
            });
            return;
          }

          // Same SSE format as OpenAI: "data: {...}" lines, ending "data: [DONE]"
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
        reject(new Error(`Failed to reach Grok: ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  private formatApiError(statusCode: number, rawBody: string): string {
    try {
      const parsed = JSON.parse(rawBody);
      const msg = parsed.error?.message ?? 'Unknown error';
      if (statusCode === 401) return `Grok: Invalid API key.`;
      if (statusCode === 429) return `Grok: Rate limit or quota exceeded.`;
      return `Grok error (${statusCode}): ${msg}`;
    } catch {
      return `Grok error (${statusCode})`;
    }
  }
}