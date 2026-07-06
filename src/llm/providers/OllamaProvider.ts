import * as http from 'http';
import { LLMProvider, ChatMessage, StreamCallback } from '../types';

/**
 * Provider for Ollama — a locally-running LLM server.
 * Default endpoint: http://localhost:11434
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
export class OllamaProvider implements LLMProvider {
  readonly name = 'Ollama';

  constructor(
    private baseUrl: string = 'http://localhost:11434',
    private model: string = 'codellama'
  ) {}

  async validateConfig(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.request('/api/tags', 'GET');
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: `Cannot reach Ollama at ${this.baseUrl}. Is it running? Try "ollama serve".`,
      };
    }
  }

  async streamChat(messages: ChatMessage[], onChunk: StreamCallback): Promise<void> {
    const url = new URL('/api/chat', this.baseUrl);
    const body = JSON.stringify({
      model: this.model,
      messages,
      stream: true,
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Ollama returned status ${res.statusCode}`));
            return;
          }

          // Ollama streams newline-delimited JSON objects, one per chunk.
          let buffer = '';
          res.on('data', (data: Buffer) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? ''; // keep incomplete last line for next chunk

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  onChunk(parsed.message.content);
                }
              } catch {
                // Ignore malformed partial JSON lines; safe to skip.
              }
            }
          });

          res.on('end', () => resolve());
          res.on('error', (err) => reject(err));
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Failed to connect to Ollama: ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }

  /** Simple helper for non-streaming requests like validateConfig(). */
  private request(path: string, method: string): Promise<string> {
    const url = new URL(path, this.baseUrl);
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: url.hostname, port: url.port, path: url.pathname, method },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Status ${res.statusCode}`));
            } else {
              resolve(data);
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }
}