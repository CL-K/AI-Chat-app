# AI-Chat App

Full-stack AI chat application built with Next.js, integrating three Ollama models (llama3, llava, gemma4) with a complete CI/CD pipeline and automated GitOps deployment on Kubernetes.

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

AI-Chat is a self-hosted AI chat platform that allows interaction with three different models through a web interface. The application communicates with an Ollama server deployed on Kubernetes for model inference.

**Available models:**

| Model | Capabilities | Route |
|---|---|---|
| `llama3:8b` | Text generation | `/llama` |
| `llava:7b` | Text + image + audio analysis | `/llava` |
| `gemma4:12b` | Text + image + audio + video | `/gemma` |

## 🏗️ Architecture

```
User
    │
    ▼
Next.js Frontend (port 3000)
    │
    ├── /llama  → POST /api/llama  → Ollama (llama3:8b)
    ├── /llava  → POST /api/llava  → Ollama (llava:7b)
    └── /gemma  → POST /api/gemma  → Ollama (gemma4:12b)
                          │
                          ▼
              http://ollama:11434/api/generate
              (Internal Kubernetes Service)
```

**Technical stack:**
- **Frontend**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Tests**: Jest + ts-jest (23 unit tests)
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

### POST `/api/llama`

Text generation with **llama3:8b**.

**Body:**
```json
{
  "prompt": "Explain Kubernetes in 3 lines"
}
```

**Response:**
```json
{
  "response": "Kubernetes is a container orchestrator..."
}
```

**Return codes:**
- `200` — response generated successfully
- `400` — missing prompt
- `500` — Ollama or network error

---

### POST `/api/llava`

Text + image + audio analysis with **llava:7b**.

**Body:**
```json
{
  "prompt": "Describe this image",
  "image": "<base64>",
  "audio": "<base64>"
}
```

> `prompt`, `image`, and `audio` are optional, but at least one is required. If `prompt` is missing, it defaults to `"Analyze this content"`.

**Return codes:**
- `200` — response generated
- `400` — prompt, image, and audio all missing
- `500` — Ollama or network error

---

### POST `/api/gemma`

Multimodal analysis with **gemma4:12b** — text, image, audio, and video.

**Body:**
```json
{
  "prompt": "Analyze this content",
  "image": "<base64>",
  "audio": "<base64>",
  "video": "<base64>"
}
```

> At least one field is required. If `prompt` is missing, it defaults to `"Analyze this content"`.

**Return codes:**
- `200` — response generated
- `400` — all fields missing
- `500` — Ollama or network error

---

### POST `/api/chat`

Generic route using **llava:7b** — alias for `/api/llava`.

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
  POST /api/llama    ✓ 6 tests
  POST /api/llava    ✓ 8 tests
  POST /api/gemma    ✓ 9 tests

Tests: 23 passed, 23 total
```

**What the tests validate:**
- Correct response with valid input
- `400` status when required fields are missing
- `500` status if Ollama returns an error
- `500` status on network error (fetch throw)
- Correct model used in the request body (`llama3:8b`, `llava:7b`, `gemma4:12b`)
- Ollama response trimmed correctly
- Media (image, audio, video) passed through or ignored correctly

## 🔄 CI/CD pipeline

The GitHub Actions pipeline runs on every push to `main`:

```
push main
  │
  ├── lint (ESLint) ──────────────────────┐
  │                                        ├── build (Docker)
  ├── tests (Jest 23 tests) ──────────────┘       │
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
│   │   │   ├── chat/route.ts   # Generic route (llava:7b)
│   │   │   ├── gemma/route.ts  # gemma4:12b route
│   │   │   ├── llama/route.ts  # llama3:8b route
│   │   │   └── llava/route.ts  # llava:7b route
│   │   ├── gemma/page.tsx      # Gemma chat page
│   │   ├── llama/page.tsx      # Llama chat page
│   │   ├── llava/page.tsx      # Llava chat page
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Home page
│   ├── public/
│   ├── test/
│   │   └── api.test.ts         # 23 unit tests
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
