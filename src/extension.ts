import * as vscode from 'vscode';
import { ChatViewProvider } from './panels/ChatViewProvider';
import { registerCodeCommands } from './commands/codeActions';

/**
 * Called once when the extension activates (VS Code decides when, based on
 * the "activationEvents"/"contributes" in package.json — typically as soon
 * as the sidebar view is revealed or a registered command is run).
 */
export function activate(context: vscode.ExtensionContext): void {
  // The chat sidebar. Built once and reused by both the webview registration
  // and the code-action commands, so they share the same conversation state.
  const chatProvider = new ChatViewProvider(context.extensionUri);

  // Register the webview view — id must exactly match package.json's
  // "views" contribution (pairmind.chatView), or VS Code won't find it.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatProvider,
      {
        // Keeps the webview's DOM/JS state alive when the sidebar is hidden
        // (e.g. user switches to Explorer tab) instead of destroying and
        // re-rendering it — preserves scroll position and chat history in the UI.
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  );

  // Explain / Refactor / Write Tests / Fix Bugs / Generate Comments
  registerCodeCommands(context, chatProvider);

  // Command to explicitly open/focus the sidebar, e.g. from the command
  // palette or a keybinding, without requiring a code selection first.
  context.subscriptions.push(
    vscode.commands.registerCommand('pairmind.openChat', () => {
      vscode.commands.executeCommand('workbench.view.extension.pairmind');
    })
  );
}

/**
 * Called when the extension is deactivated (VS Code shutting down, or the
 * extension being disabled/uninstalled). Everything pushed to
 * context.subscriptions is disposed automatically — nothing manual needed
 * here unless you open resources (file watchers, servers, etc.) that
 * aren't tracked as Disposables.
 */
export function deactivate(): void {}