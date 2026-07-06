import * as vscode from 'vscode';

/**
 * Gathers relevant context from the active editor (open file, selection,
 * language) and formats it as a prompt-friendly string to prepend to
 * user messages. This is what makes chat responses "aware" of your code
 * without you having to paste it manually.
 */
export function buildContext(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return ''; // No open file — nothing to add.
  }

  const document = editor.document;
  const selection = editor.selection;
  const fileName = vscode.workspace.asRelativePath(document.uri);
  const language = document.languageId;

  const hasSelection = !selection.isEmpty;
  const selectedText = hasSelection ? document.getText(selection) : '';

  // If there's a selection, prioritize that — it's almost always more
  // relevant than the whole file, and keeps prompts smaller/cheaper.
  if (hasSelection) {
    const startLine = selection.start.line + 1;
    const endLine = selection.end.line + 1;
    return [
      `Context: Selected code from "${fileName}" (lines ${startLine}-${endLine}), language: ${language}.`,
      '```' + language,
      selectedText,
      '```',
    ].join('\n');
  }

  // No selection: fall back to the full open file, but cap its size so
  // we don't blow the model's context window or the user's API costs.
  const fullText = document.getText();
  const MAX_CHARS = 6000;
  const truncated = fullText.length > MAX_CHARS;
  const contextText = truncated ? fullText.slice(0, MAX_CHARS) : fullText;

  return [
    `Context: Currently open file "${fileName}", language: ${language}${truncated ? ' (truncated, file is large)' : ''}.`,
    '```' + language,
    contextText,
    '```',
  ].join('\n');
}

/**
 * Returns just the selected text (or empty string), for use by code-action
 * commands like "Explain Code" that operate on a specific selection rather
 * than needing the full formatted context block.
 */
export function getSelectedText(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return '';
  return editor.document.getText(editor.selection);
}

/** Returns true if there's an active editor with a non-empty selection. */
export function hasActiveSelection(): boolean {
  const editor = vscode.window.activeTextEditor;
  return !!editor && !editor.selection.isEmpty;
}