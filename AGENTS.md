# Janos Salones Dashboard — Coding Standards

## Stack
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Auth**: NextAuth.js

## TypeScript
- Use `const`/`let`, never `var`
- Prefer interfaces over types for object shapes
- Avoid `any` — use proper types or `unknown`
- All API route handlers must be properly typed

## React / Next.js
- Use functional components with named exports
- Server components by default; add `"use client"` only when needed
- Keep components focused and reusable
- Use `DashboardContext` for shared dashboard state

## API & Data
- Never hardcode credentials or API keys — use `.env.local`
- All `.env*` files are gitignored — never commit secrets
- Validate inputs on API routes before database operations

## Git
- Commit messages: `type(scope): description` (e.g. `feat(dashboard): add score panel`)
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`
- Never commit `.env.local`, `node_modules`, or build artifacts
