# Skill Registry — JanosSalones Dashboard

_Last updated: 2026-04-04_
_SDD initialized: openspec mode (config.yaml created)_

## Project Conventions

### Sources
- /home/mchapouille/serendipia/works/janos/dashboard/AGENTS.md

### Compact Rules (auto-resolved)
- **Stack**: Next.js 16.1.6 (App Router), TypeScript 5 (strict), Tailwind CSS v4, NextAuth.js v5 beta
- **Data**: Static JSON (`src/lib/salones_data.json`) — no Prisma/DB, data refreshed via GitHub Actions + Python scripts
- **TypeScript**: use const/let; prefer interfaces over types; avoid `any`; type all API handlers
- **React/Next**: server components by default; `"use client"` only when needed; named functional components; use `DashboardContext` for shared dashboard state
- **API/Data**: never hardcode credentials; validate inputs before DB ops; use `.env.local` (gitignored)
- **Git**: conventional commits `type(scope): description`; types: feat|fix|chore|refactor|docs; never commit `.env.local`, `node_modules`, build artifacts
- **Global**: never run builds after changes
- **Path alias**: `@/*` → `./src/*`

### Testing Capabilities
- **Test runner**: ❌ None installed (no vitest/jest/mocha in package.json)
- **Strict TDD Mode**: ❌ Unavailable (no test runner)
- **Unit tests**: ❌ Not available
- **Integration tests**: ❌ Not available
- **E2E tests**: ❌ Not available
- **Coverage**: ❌ Not available
- **Linter**: ✅ ESLint 9 (`eslint` — eslint-config-next, core-web-vitals + typescript)
- **Type checker**: ✅ `tsc --noEmit` (TypeScript 5 strict mode)
- **Formatter**: ❌ Prettier not configured

## Available Skills

### User-Level Skills (from ~/.config/opencode/skills)
| Skill | Description | Trigger | Path |
|------|-------------|---------|------|
| branch-pr | PR creation workflow for Agent Teams Lite following the issue-first enforcement system. | When creating a pull request, opening a PR, or preparing changes for review. | /home/mchapouille/.config/opencode/skills/branch-pr/SKILL.md |
| issue-creation | Issue creation workflow for Agent Teams Lite following the issue-first enforcement system. | When creating a GitHub issue, reporting a bug, or requesting a feature. | /home/mchapouille/.config/opencode/skills/issue-creation/SKILL.md |
| go-testing | Go testing patterns for Gentleman.Dots, including Bubbletea TUI testing. | When writing Go tests, using teatest, or adding test coverage. | /home/mchapouille/.config/opencode/skills/go-testing/SKILL.md |
| judgment-day | Parallel adversarial review protocol with dual blind judges. | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | /home/mchapouille/.config/opencode/skills/judgment-day/SKILL.md |
| skill-creator | Creates new AI agent skills following the Agent Skills spec. | When user asks to create a new skill, add agent instructions, or document patterns for AI. | /home/mchapouille/.config/opencode/skills/skill-creator/SKILL.md |
| sdd-init | Initialize SDD context in any project. | When user says "sdd init", "iniciar sdd", "openspec init". | /home/mchapouille/.config/opencode/skills/sdd-init/SKILL.md |
| sdd-explore | Explore and investigate ideas before committing to a change. | When the orchestrator launches to think through a feature or clarify requirements. | /home/mchapouille/.config/opencode/skills/sdd-explore/SKILL.md |
| sdd-propose | Create a change proposal with intent, scope, and approach. | When the orchestrator launches to create or update a proposal. | /home/mchapouille/.config/opencode/skills/sdd-propose/SKILL.md |
| sdd-spec | Write specifications with requirements and scenarios. | When the orchestrator launches to write or update specs. | /home/mchapouille/.config/opencode/skills/sdd-spec/SKILL.md |
| sdd-design | Create technical design document with architecture decisions. | When the orchestrator launches to write or update the technical design. | /home/mchapouille/.config/opencode/skills/sdd-design/SKILL.md |
| sdd-tasks | Break down a change into an implementation task checklist. | When the orchestrator launches to create or update the task breakdown. | /home/mchapouille/.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd-apply | Implement tasks from the change. | When the orchestrator launches to implement one or more tasks. | /home/mchapouille/.config/opencode/skills/sdd-apply/SKILL.md |
| sdd-verify | Validate that implementation matches specs. | When the orchestrator launches to verify a completed change. | /home/mchapouille/.config/opencode/skills/sdd-verify/SKILL.md |
| sdd-archive | Sync delta specs to main specs and archive a completed change. | When the orchestrator launches to archive a change. | /home/mchapouille/.config/opencode/skills/sdd-archive/SKILL.md |
| sdd-onboard | Guided end-to-end walkthrough of the SDD workflow. | When the orchestrator launches to onboard a user through the full SDD cycle. | /home/mchapouille/.config/opencode/skills/sdd-onboard/SKILL.md |

## Project-Level Skills
- None detected (.claude/skills, .gemini/skills, .agent/skills, skills/ not found)
