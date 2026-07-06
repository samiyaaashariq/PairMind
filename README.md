~Samiya Shariq: PairMind

An AI pair programmer for VS Code — a chat sidebar with multi-provider LLM support and context-aware code actions, inspired by tools like GitHub Copilot Chat and Cursor.





What it does

PairMind lives in your VS Code sidebar and helps you understand, write, fix, and document code — using whichever AI model you choose, local or cloud.

	•	💬 Chat sidebar with streamed, real-time responses, styled to match your VS Code theme automatically
	•	🔌 Multiple LLM providers — swap between Ollama (local, free, private), OpenAI, and xAI Grok from a single settings dropdown
	•	🧠 Context-aware — automatically pull…
[4:29 pm, 6/7/2026] ~Samiya Shariq: git clone https://github.com/YOUR-USERNAME/pairmind.git
cd pairmind
npm install
npm run compile
[4:29 pm, 6/7/2026] ~Samiya Shariq: Then press F5 in VS Code to launch the Extension Development Host, and open the chat via Command Palette: PairMind: Open Chat

Option A — Local model, free, no API key (Ollama)

Install Ollama from https://ollama.com/download, then:
[4:29 pm, 6/7/2026] ~Samiya Shariq: ollama pull qwen2.5-coder:1.5b
[4:30 pm, 6/7/2026] ~Samiya Shariq: 1.	Get an API key from platform.openai.com/api-keys or console.x.ai
	2.	In VS Code settings, set pairmind.provider to openai or grok
	3.	Paste your key into the matching apiKey setting

Known limitations

These are intentional scoping decisions for a prototype, not oversights — noted here for transparency:

	•	API keys are stored in plaintext VS Code settings rather than the SecretStorage API. Fine for local dev/testing; would need to change before any public distribution.
	•	The Activity Bar icon doesn’t currently render in all themes — cosmetic only. The chat is fully accessible via Command Palette (PairMind: Open Chat) regardless.
	•	Error handling has been verified for the primary failure paths (bad model name, provider unreachable) but not exhaustively fuzz-tested.

Roadmap

	•	Migrate API keys to VS Code’s SecretStorage API
	•	Fix Activity Bar icon rendering
	•	Add inline diff view for Refactor/Fix Bugs suggestions
	•	Persist chat history across VS Code sessions
	•	Publish to the VS Code Marketplace

License

MIT
