# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- This repo explores simulating a Technical Program Manager (TPM) using LLM flows. The primary app lives in tpm-agent, a Next.js (App Router) TypeScript app that:
  - Implements GitHub OAuth login (NextAuth)
  - Connects to GitHub’s official MCP server via Azure OpenAI Responses API
  - Provides a simple UI with three views: Repo (select a repository), Repo Issues (list issues), and Chat (streamed AI responses)

Where to work (constraints from CLAUDE.md)
- Only modify files under tpm-agent/app unless explicitly asked otherwise
- Do not modify README files unless explicitly asked
- Use ES modules (import/export) and prefer destructured imports
- Prefer typechecking after code changes; if tests exist, run focused tests instead of full-suite runs

Setup and environment
- Install dependencies (run commands from the app directory):
  - cd tpm-agent && npm install
- Required environment variables in tpm-agent/.env.local (values are user-provided):
  - GitHub OAuth: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET
  - Azure OpenAI Responses API: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY
  - Optional: AZURE_OPENAI_DEPLOYMENT (default: gpt-4o), AZURE_OPENAI_API_VERSION (default: 2025-03-01-preview)

Common commands (run in tpm-agent)
- Development server (Turbopack): npm run dev
- Build: npm run build
- Start (after build): npm run start
- Lint: npm run lint
- Typecheck: npx tsc -p tsconfig.json --noEmit
- Tests: no test runner is currently configured in package.json

High-level architecture (big picture)
- App shell and providers
  - app/layout.tsx: wraps the app with fonts and Providers
  - app/providers.tsx: composes SessionProvider (NextAuth), RepositoryProvider (custom context), and ToastProvider (lightweight UI toasts)
- Authentication (NextAuth + GitHub)
  - app/api/auth/[...nextauth]/auth-options.ts configures GitHub provider with scopes: repo read:user read:org
  - Access token is attached to the JWT (token.accessToken) but intentionally not exposed on the client session; server routes retrieve it with getToken from next-auth/jwt
- API layer (server routes under app/api)
  - app/api/repos/route.ts: lists repositories the user can modify (owner/collaborator with push/admin). Uses the GitHub token from getToken
  - app/api/issues/route.ts: returns issues for the selected repository
  - app/api/responses/route.ts: bridges to Azure OpenAI Responses API
    - Loads prompt instructions from app/config/instructions.md
    - Streams output as text/event-stream (SSE) using the SDK’s streaming helper
    - Adds a GitHub MCP tool (server_url: https://api.githubcopilot.com/mcp/) with Authorization: Bearer <GitHub token> so the model can call GitHub via MCP
    - PUT updates the “active repository” context by emitting an assistant message and returns a new responseId
- Client-side framework
  - app/page.tsx: a single page that toggles between three views via local state: Repo, Repo Issues, Chat (no separate /repo route)
  - Repository context (app/context/repository.tsx):
    - selectedRepository stored in React state and persisted to localStorage
    - lastUpdatedRepositoryId helps ensure repository context gets synchronized with the AI thread
  - Chat flow
    - lib/azure-openai.ts exposes streamResponses (async generator reading SSE) and updateRepositoryContext (PUT to /api/responses)
    - app/chat.tsx handles message state, streaming chunks into the active assistant message, persists chat and lastResponseId to localStorage, and updates repository context when the active repository changes
- Utilities and styling
  - lib/logger.ts: environment-aware logging with NEXT_PUBLIC_LOG_LEVEL (default: debug in dev, error in prod)
  - app/utils/toast.tsx: minimal toast system with animations
  - app/globals.css: Tailwind CSS v4 style usage

Notes and gotchas
- Documentation in app/config/instructions.md references a Link to “/repo”, but the current UI implements the repository list as a tab within the home page (app/page.tsx). There is no dedicated /repo route
- MCP access uses the user’s GitHub token provided by NextAuth; ensure the requested scopes are sufficient for any repository-managing actions invoked by the model

