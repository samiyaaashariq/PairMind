PairMind

PairMind is a VS Code extension that adds an AI chat assistant to your editor, similar to GitHub Copilot Chat or Cursor.

You can chat with it about your code, and it automatically knows what file you have open or what code you’ve selected — so you don’t have to copy-paste anything.

What it can do-
	•	Chat with AI right inside VS Code — ask questions, get help, see responses stream in live
	•	Choose your AI — use a free local model (Ollama), or connect OpenAI or Grok with your own API key
	•	Right-click any code to instantly:
	•	Explain it
	•	Refactor it
	•	Write tests for it
	•	Fix bugs in it
	•	Add comments to it
	•	Insert AI-generated code directly into your file with one click
	How to run it

	1.	Download or clone this project
	2.	Open a terminal in the project folder and run:
npm install
npm run compile

	3.	Open the project in VS Code
	4.	Press F5 to launch a test window with the extension running
	5.	Open the Command Palette (Ctrl+Shift+P) and type: PairMind: Open Chat

Setting up an AI provider

Option 1: Free, runs on your computer (Ollama)

	1.	Download Ollama from ollama.com/download
	2.	Open a terminal and run:
ollama pull qwen2.5-coder:1.5b

	3.	That’s it — PairMind uses this by default

Option 2: Faster, cloud-based (OpenAI or Grok)

	1.	Get an API key from platform.openai.com or console.x.ai
	2.	In VS Code, go to Settings (Ctrl+,), search “pairmind”
	3.	Set the provider to openai or grok, and paste in your API key

Built with

TypeScript, Webpack, and the VS Code Extension API.

Known limitations

	•	API keys are currently saved as plain text in settings (not fully secure yet)
	•	The sidebar icon doesn’t always show up — you can still open the chat through the Command Palette
	•	Not published to the VS Code Marketplace yet

License

MIT
