import * as vscode from 'vscode';
import { LLMManager } from '../llm/LLMManager';
import { ChatMessage } from '../llm/types';
import { buildContext } from '../context/ContextBuilder';

/**
 * Hosts the PairMind chat sidebar webview.
 * Owns conversation history and wires together LLMManager (which provider
 * to use) and ContextBuilder (what code context to include).
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  /** Must match the view id declared in package.json's "views" contribution. */
  public static readonly viewType = 'pairmind.chatView';

  private view?: vscode.WebviewView;
  private llmManager: LLMManager;
  private history: ChatMessage[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {
    this.llmManager = new LLMManager();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'sendMessage':
          await this.handleUserMessage(msg.text, msg.includeContext);
          break;
        case 'clearChat':
          this.history = [];
          break;
        case 'insertCode':
          this.insertIntoEditor(msg.code);
          break;
      }
    });
  }

  /**
   * Entry point used by code-action commands (Explain, Refactor, etc.)
   * to inject a pre-built prompt into the chat as if the user had typed it.
   */
  public async runPrompt(promptText: string): Promise<void> {
    // Ensure the sidebar is visible so the user sees the response arrive.
    await vscode.commands.executeCommand('pairmind.chatView.focus');
    await this.handleUserMessage(promptText, false); // context already embedded in promptText
  }

  private post(message: unknown): void {
    this.view?.webview.postMessage(message);
  }

  private async handleUserMessage(text: string, includeContext: boolean): Promise<void> {
    if (!text || !text.trim()) return;

    const contextBlock = includeContext ? buildContext() : '';
    const fullPrompt = contextBlock ? `${contextBlock}\n\n${text}` : text;

    this.history.push({ role: 'user', content: fullPrompt });
    this.post({ type: 'userMessage', text }); // show the clean text, not the context block, in the UI
    this.post({ type: 'loading', value: true });

    try {
      let assistantText = '';
      await this.llmManager.streamChat(this.history, (chunk) => {
        assistantText += chunk;
        this.post({ type: 'streamChunk', text: chunk });
      });

      this.history.push({ role: 'assistant', content: assistantText });
      this.post({ type: 'streamDone' });
    } catch (err: any) {
      const message = err?.message ?? 'An unknown error occurred.';
      this.post({ type: 'error', message });
      vscode.window.showErrorMessage(`PairMind: ${message}`);

      // Roll back the user message on failure so retrying doesn't duplicate
      // a broken turn in history sent to the model.
      this.history.pop();
    } finally {
      this.post({ type: 'loading', value: false });
    }
  }

  private insertIntoEditor(code: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('PairMind: No active editor to insert code into.');
      return;
    }
    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, code);
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css'));
    const nonce = getNonce();

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet" />
      </head>
      <body>
        <div id="chat-container">
          <div id="messages"></div>
          <div id="loading-indicator" class="hidden">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
          <div id="input-area">
            <textarea id="prompt-input" placeholder="Ask PairMind about your code…" rows="2"></textarea>
            <div id="controls">
              <label class="context-toggle">
                <input type="checkbox" id="include-context" checked />
                Include current file/selection
              </label>
              <div class="buttons">
                <button id="clear-btn" title="Clear conversation">Clear</button>
                <button id="send-btn" title="Send message">Send</button>
              </div>
            </div>
          </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

/** Generates a random nonce so inline script execution is CSP-restricted to our own script tag. */
function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}