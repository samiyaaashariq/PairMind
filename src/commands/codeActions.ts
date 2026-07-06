import * as vscode from 'vscode';
import { ChatViewProvider } from '../panels/ChatViewProvider';
import { getSelectedText, hasActiveSelection } from '../context/ContextBuilder';

/**
 * Registers all PairMind code-action commands: Explain, Refactor,
 * Write Tests, Fix Bugs, Generate Comments. Each one builds a purpose-built
 * prompt from the current selection and hands it to ChatViewProvider,
 * reusing all the existing streaming/error-handling logic.
 */
export function registerCodeCommands(
  context: vscode.ExtensionContext,
  chatProvider: ChatViewProvider
): void {
  const commands: { id: string; buildPrompt: (code: string, language: string) => string }[] = [
    {
      id: 'pairmind.explainCode',
      buildPrompt: (code, language) =>
        `Explain what this ${language} code does, step by step, in plain language:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
    {
      id: 'pairmind.refactorCode',
      buildPrompt: (code, language) =>
        `Refactor this ${language} code for readability, performance, and best practices. ` +
        `Explain the key changes, then show the refactored code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
    {
      id: 'pairmind.writeTests',
      buildPrompt: (code, language) =>
        `Write unit tests for this ${language} code, covering typical cases and edge cases. ` +
        `Use a testing framework appropriate for ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
    {
      id: 'pairmind.fixBugs',
      buildPrompt: (code, language) =>
        `Find and fix any bugs in this ${language} code. Explain what was wrong, ` +
        `then show the corrected code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
    {
      id: 'pairmind.generateComments',
      buildPrompt: (code, language) =>
        `Add clear, concise comments and docstrings to this ${language} code ` +
        `without changing its behavior. Show the fully commented version:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ];

  for (const { id, buildPrompt } of commands) {
    const disposable = vscode.commands.registerCommand(id, async () => {
      if (!hasActiveSelection()) {
        vscode.window.showWarningMessage(
          'PairMind: Select some code first, then run this command.'
        );
        return;
      }

      const editor = vscode.window.activeTextEditor!;
      const code = getSelectedText();
      const language = editor.document.languageId;

      await chatProvider.runPrompt(buildPrompt(code, language));
    });

    context.subscriptions.push(disposable);
  }
}