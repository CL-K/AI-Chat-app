# AI-Chat App

Full-stack AI chat application built with Next.js. It discovers installed Ollama models and exposes their supported capabilities through a generic chat interface, with CI/CD and GitOps deployment on Kubernetes.

## 📋 Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [API routes](#api-routes)
- [Tests](#tests)
- [CI/CD pipeline](#cicd-pipeline)
- [Dockerfile](#dockerfile)
- [Project structure](#project-structure)
- [Related repositories](#related-repositories)

## 🎯 Overview

AI-Chat is a self-hosted AI chat platform that discovers the models installed in Ollama and lets users chat with them through a web interface. The application communicates with an Ollama server deployed on Kubernetes for model inference.

The home page fetches the installed model list from Ollama and checks each model's capabilities via `/api/show`. Every listed model opens the same general chat and is sent to Ollama by its exact model name; no model names are hard-coded into the home page. The image upload is shown only when Ollama reports the `vision` capability, and the API checks this capability again before sending an image. Install another model with `ollama pull <model>`, then refresh the page.

## 🏗️ Architecture

```
User
    │
    ▼
Next.js Frontend (port 3000)
    │
    ├── GET /api/models → Ollama /api/tags + /api/show
    └── /chat → POST /api/chat → selected installed Ollama model
                          │
                          ▼
              http://ollama:11434/api/generate
              (Internal Kubernetes Service)
```

**Technical stack:**
- **Frontend**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Tests**: Jest + ts-jest (28 unit tests)
- **CI/CD**: GitHub Actions
- **Registry**: GitHub Container Registry (GHCR)
- **Deployment**: Kubernetes (K3s) via ArgoCD GitOps
- **Security**: Trivy scan blocking on CRITICAL/HIGH

## 📦 Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **Docker** (for image builds)
- **Ollama** accessible at `http://ollama:11434` (or configure `OLLAMA_API_URL`)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/cl-k/AI-Chat-app
cd AI-Chat-app/AI-Chat
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 4. Run in development mode

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

### 5. Run with Docker Compose (recommended)

```bash
# At the repo root
docker-compose up
```

Starts the Next.js app and Ollama together.

## ⚙️ Environment variables

| Variable | Default value | Description |
|---|---|---|
| `OLLAMA_API_URL` | `http://ollama:11434` | Ollama server URL |
| `NODE_ENV` | `development` | Node.js environment |

> In local development, set `OLLAMA_API_URL` to `http://localhost:11434` if Ollama is running on your machine.

## 🔌 API routes

### POST `/api/chat`

Generic text-generation and image-analysis route. The selected model name is required. Images are allowed only for models whose Ollama capabilities include `vision`.

**Body:**
```json
{
  "model": "qwen2.5:7b",
  "prompt": "Explain Kubernetes in 3 lines"
}
```

### GET `/api/models`

Returns all installed model names and capabilities, as reported by the Ollama `/api/tags` and `/api/show` endpoints.

**Response:**
```json
{
  "models": [
    { "name": "qwen2.5vl:7b", "capabilities": ["completion", "vision"] }
  ]
}
```

## 🧪 Tests

The unit tests mock `fetch` to Ollama — no local Ollama instance is required to run them.

```bash
# Run the tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Expected result:**
```
PASS  test/api.test.ts
  GET /api/models    ✓ 3 tests
  POST /api/chat     ✓ 5 tests

Tests: 8 passed, 8 total
```

**What the tests validate:**
- Correct response with valid input
- `400` status when required fields are missing
- `500` status if Ollama returns an error
- `500` status on network error (fetch throw)
- Selected Ollama model used for generation
- Ollama response trimmed correctly
- Images are accepted only when Ollama reports the `vision` capability

## 🔄 CI/CD pipeline

The GitHub Actions pipeline runs on every push to `main`:

```
push main
  │
  ├── lint (ESLint) ──────────────────────┐
  │                                        ├── build (Docker)
  ├── tests (Jest 8 tests) ──────────────┘       │
  │                                               ▼
  │                                       security (Trivy scan)
  │                                               │
  │                                     if scan OK → promote :latest
  │                                               │
  └───────────────────────────────────────────────▼
                                          update-infra (GitOps)
                                          → update frontend.yaml
                                          → ArgoCD deploys to K3s
```

**Pipeline features:**
- npm cache (`setup-node`) — faster lint/test builds
- Docker cache (`type=gha`) — faster rebuilds
- Blocking Trivy scan on `CRITICAL,HIGH` — no vulnerable image passes
- `latest` promoted only after scan validation
- Slack notification on failure
- Automatic tag update in [AI-Chat-gitops](https://github.com/cl-k/AI-Chat-gitops)

## 🐳 Dockerfile

Multi-stage image optimized for production:

```
Stage 1 (deps)    — install npm dependencies
Stage 2 (build)   — compile Next.js (standalone mode)
Stage 3 (runtime) — final lightweight image (~80-100MB)
```

**Optimizations:**
- Next.js `standalone` mode — image 5x lighter
- Non-root user (`appuser`) — improved security
- `NEXT_TELEMETRY_DISABLED=1` — no telemetry sent to Vercel
- Built-in `HEALTHCHECK` — detects crashes automatically
- Optimized Docker cache — `package.json` copied before source code

> Requires `output: 'standalone'` in `next.config.ts`.

## 📁 Project structure

```
AI-Chat-app/
├── .github/
│   └── workflows/
│       └── CI.yml              # GitHub Actions pipeline
├── AI-Chat/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts   # Generic model chat route
│   │   │   ├── models/route.ts # Lists installed Ollama models
│   │   │   ├── chat/route.ts   # Dynamic model chat and vision checks
│   │   │   └── models/route.ts # Lists models and capabilities
│   │   ├── chat/page.tsx       # Chat page for other installed models
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Home page
│   ├── public/
│   ├── test/
│   │   └── api.test.ts         # 8 unit tests
│   ├── .dockerignore
│   ├── .trivyignore            # Ignored CVEs (devDependencies)
│   ├── Dockerfile
│   ├── jest.config.js
│   ├── next.config.ts          # output: 'standalone'
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml
```

## 📚 Related repositories

| Repo | Description |
|---|---|
| [AI-Chat-gitops](https://github.com/cl-k/AI-Chat-gitops) | Kubernetes manifests (GitOps) |
| [AI-Chat-infra](https://github.com/cl-k/AI-Chat-infra) | AWS infrastructure (K3s cluster) |

## 📝 License

This project is licensed under the MIT License.  
See [LICENSE](LICENSE) for more details.

## 👤 Author

Created by Cheick — June 2026
