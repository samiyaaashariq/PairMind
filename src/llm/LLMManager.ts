import * as vscode from 'vscode';
import { LLMProvider, ChatMessage, StreamCallback, ProviderConfig, ProviderId } from './types';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GrokProvider } from './providers/GrokProvider';

/**
 * Reads PairMind settings from VS Code configuration and delegates
 * chat requests to whichever provider is currently active.
 * This is the ONLY class the rest of the extension should talk to
 * for LLM calls — it hides which provider is in use.
 */
export class LLMManager {
  /**
   * Builds a fresh provider instance from current settings each time.
   * Reading settings live (instead of caching) means users can change
   * their provider/API key and immediately see it take effect —
   * no reload required.
   */
  private getActiveProvider(): LLMProvider {
    const config = this.readConfig();

    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider(config.ollama.baseUrl, config.ollama.model);
      case 'openai':
        return new OpenAIProvider(config.openai.apiKey, config.openai.model);
      case 'grok':
        return new GrokProvider(config.grok.apiKey, config.grok.model);
      default:
        // Should be unreachable given the settings enum, but fail loudly if it happens.
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /** Reads and types all PairMind settings from VS Code configuration. */
  private readConfig(): ProviderConfig {
    const cfg = vscode.workspace.getConfiguration('pairmind');

    return {
      provider: cfg.get<ProviderId>('provider', 'ollama'),
      ollama: {
        baseUrl: cfg.get<string>('ollama.baseUrl', 'http://localhost:11434'),
        model: cfg.get<string>('ollama.model', 'codellama'),
      },
      openai: {
        apiKey: cfg.get<string>('openai.apiKey', ''),
        model: cfg.get<string>('openai.model', 'gpt-4o'),
      },
      grok: {
        apiKey: cfg.get<string>('grok.apiKey', ''),
        model: cfg.get<string>('grok.model', 'grok-2-latest'),
      },
    };
  }

  /** Name of the currently active provider, e.g. for showing "Using: OpenAI" in the UI. */
  public getActiveProviderName(): string {
    return this.getActiveProvider().name;
  }

  /** Checks the active provider is reachable/configured before use. */
  public async validateActiveProvider(): Promise<{ ok: boolean; message?: string }> {
    return this.getActiveProvider().validateConfig();
  }

  /**
   * Main entry point used by ChatViewProvider: streams a chat response
   * from whichever provider is currently configured.
   */
  public async streamChat(messages: ChatMessage[], onChunk: StreamCallback): Promise<void> {
    const provider = this.getActiveProvider();

    const check = await provider.validateConfig();
    if (!check.ok) {
      throw new Error(check.message ?? `${provider.name} is not configured correctly.`);
    }

    await provider.streamChat(messages, onChunk);
  }
}