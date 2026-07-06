/**
 * Shared types for the LLM provider system.
 * Every provider (Ollama, OpenAI, Grok) implements the LLMProvider interface,
 * so the rest of the extension never needs to know which one is active.
 */

/** A single message in a chat conversation. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Callback invoked for each streamed chunk of text as it arrives.
 * Providers call this repeatedly as tokens come in from the API.
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Common contract all LLM providers must implement.
 * This is the abstraction that makes providers swappable.
 */
export interface LLMProvider {
  /** Human-readable name shown in logs/errors, e.g. "OpenAI", "Ollama". */
  readonly name: string;

  /**
   * Send a full conversation to the model and stream the response back
   * chunk by chunk via onChunk. Should resolve once the stream ends,
   * and throw on network/auth/API errors so the caller can show them.
   */
  streamChat(messages: ChatMessage[], onChunk: StreamCallback): Promise<void>;

  /**
   * Optional lightweight check to confirm the provider is reachable/configured
   * (e.g. Ollama server running, API key present). Used for friendlier errors.
   */
  validateConfig(): Promise<{ ok: boolean; message?: string }>;
}

/** Identifiers for the providers users can select in settings. */
export type ProviderId = 'ollama' | 'openai' | 'grok';

/** Resolved configuration read from VS Code settings for the active provider. */
export interface ProviderConfig {
  provider: ProviderId;
  ollama: {
    baseUrl: string;   // e.g. "http://localhost:11434"
    model: string;     // e.g. "codellama"
  };
  openai: {
    apiKey: string;
    model: string;     // e.g. "gpt-4o"
  };
  grok: {
    apiKey: string;
    model: string;     // e.g. "grok-2-latest"
  };
}