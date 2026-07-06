// PairMind webview frontend logic.
// Runs inside the webview's sandboxed browser context — no Node/vscode API
// access here. All communication with the extension goes through
// vscode.postMessage() / window.addEventListener('message').

(function () {
  const vscode = acquireVsCodeApi();

  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('prompt-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loadingEl = document.getElementById('loading-indicator');
  const includeContextEl = document.getElementById('include-context');

  let currentAssistantBubble = null; // the DOM element being streamed into

  // ---------- Sending messages ----------

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    vscode.postMessage({
      type: 'sendMessage',
      text,
      includeContext: includeContextEl.checked,
    });

    inputEl.value = '';
    setInputDisabled(true);
  }

  sendBtn.addEventListener('click', sendMessage);

  // Enter sends, Shift+Enter inserts a newline — standard chat UX.
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  clearBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'clearChat' });
    messagesEl.innerHTML = '';
  });

  // ---------- Rendering ----------

  function setInputDisabled(disabled) {
    sendBtn.disabled = disabled;
    inputEl.disabled = disabled;
  }

  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'message user';
    el.textContent = text; // textContent, not innerHTML — never trust/render raw user input as HTML
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function startAssistantMessage() {
    const el = document.createElement('div');
    el.className = 'message assistant';
    el.dataset.raw = ''; // accumulate raw markdown-ish text here as chunks arrive
    messagesEl.appendChild(el);
    currentAssistantBubble = el;
    scrollToBottom();
    return el;
  }

  function appendChunkToAssistant(chunk) {
    if (!currentAssistantBubble) {
      startAssistantMessage();
    }
    currentAssistantBubble.dataset.raw += chunk;
    renderAssistantContent(currentAssistantBubble);
    scrollToBottom();
  }

  function finishAssistantMessage() {
    currentAssistantBubble = null;
  }

  function appendErrorMessage(message) {
    const el = document.createElement('div');
    el.className = 'message error';
    el.textContent = `⚠ ${message}`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  /**
   * Renders accumulated raw text into the bubble, converting fenced
   * ```code``` blocks into <pre><code> with an "Insert" button.
   * Deliberately simple (not a full markdown parser) — just enough
   * to make code blocks readable and actionable.
   */
  function renderAssistantContent(el) {
    const raw = el.dataset.raw;
    el.innerHTML = ''; // safe: we rebuild from escaped/controlled pieces below

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      // Plain text before this code block
      if (match.index > lastIndex) {
        appendTextNode(el, raw.slice(lastIndex, match.index));
      }
      appendCodeBlock(el, match[2]);
      lastIndex = codeBlockRegex.lastIndex;
    }

    // Remaining trailing text (or the whole thing, if no code block yet)
    if (lastIndex < raw.length) {
      appendTextNode(el, raw.slice(lastIndex));
    }
  }

  function appendTextNode(parent, text) {
    const span = document.createElement('span');
    span.textContent = text; // escapes automatically via textContent
    parent.appendChild(span);
  }

  function appendCodeBlock(parent, code) {
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    parent.appendChild(pre);

    const insertBtn = document.createElement('button');
    insertBtn.className = 'insert-btn';
    insertBtn.textContent = 'Insert into editor';
    insertBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'insertCode', code });
    });
    parent.appendChild(insertBtn);
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---------- Messages coming FROM the extension ----------

  window.addEventListener('message', (event) => {
    const msg = event.data;

    switch (msg.type) {
      case 'userMessage':
        appendUserMessage(msg.text);
        break;

      case 'streamChunk':
        appendChunkToAssistant(msg.text);
        break;

      case 'streamDone':
        finishAssistantMessage();
        setInputDisabled(false);
        inputEl.focus();
        break;

      case 'loading':
        loadingEl.classList.toggle('hidden', !msg.value);
        break;

      case 'error':
        finishAssistantMessage();
        appendErrorMessage(msg.message);
        setInputDisabled(false);
        break;
    }
  });
})();