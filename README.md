# AI Chatbot UI

[![CI](https://github.com/sifrstack/ai-chatbot-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/sifrstack/ai-chatbot-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A full-stack chatbot prototype with a responsive web interface and a Flask backend. It streams Gemini-generated responses and enriches time or weather questions with live Galway data.

## Features

- Responsive chat interface built with HTML, CSS, and JavaScript
- Flask API with server-sent event streaming
- Gemini API integration using the Google Gen AI SDK
- Live Europe/Dublin time context
- Live Galway weather data from Open-Meteo
- 60-second weather caching to reduce repeated requests
- Automated pytest and Ruff checks with GitHub Actions
- Environment-based configuration with no API keys committed to source control

## Architecture

```text
Browser UI
   │
   │ POST /api/chat/stream
   ▼
Flask backend
   ├── Gemini API for generated responses
   └── Open-Meteo for live Galway weather
```

The frontend streams response chunks from the Flask backend and updates the chat window as data arrives.

## Run locally

### 1. Clone and create an environment

```bash
git clone https://github.com/sifrstack/ai-chatbot-ui.git
cd ai-chatbot-ui

python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the API key

Copy the example environment file or export the variable directly:

```bash
export GEMINI_API_KEY="YOUR_KEY"
```

Optional:

```bash
export GEMINI_MODEL="gemini-3.6-flash"
```

Never commit a real API key. The repository includes `.env.example` for configuration guidance.

### 4. Start the backend

```bash
python3 server/app.py
```

Open the local address printed by Flask in your browser.

## Tests and code quality

```bash
pip install -r requirements-dev.txt
pytest -q
ruff check .
```

The same checks run automatically through GitHub Actions.

## Deployment

The frontend is compatible with GitHub Pages. The Flask backend must be hosted separately with `GEMINI_API_KEY` configured in the hosting environment. `script.js` selects the local Flask URL during development and the hosted API URL in production.

## Current limitations

- The hosted backend may have a cold-start delay on free hosting
- Weather context currently uses fixed Galway coordinates
- Responses depend on third-party API availability and quota
- This is a portfolio prototype, not a production support service

## What this project demonstrates

This project combines frontend development, Python backend design, REST-style API integration, streaming responses, environment management, third-party APIs, automated testing, and CI/CD.

## License

MIT
