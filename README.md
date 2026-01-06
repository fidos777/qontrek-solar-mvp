# Qontrek Solar MVP

AI-Governed Solar Quote Generator with CIVOS Classification.

## Features

- ✅ Type A/B/C CIVOS classification
- ✅ CFO budget oversight (RED/YELLOW/GREEN)
- ✅ Type B confirmation with 1-second delay
- ✅ Quote generation with Malaysia pricing (RM 3.20-3.50/watt)
- ✅ Vocabulary guard (blocks "guarantee", "promise savings")

## Run Locally

```bash
npm install
npm run build:packages
npm run dev
```

Open http://localhost:3000

## Governance Rules

| Type | Action | Execution |
|------|--------|-----------|
| A | Info queries | AUTO |
| B | Quotes, sends | CONFIRM (1s delay) |
| C | Payments, contracts | HOLD |

## Structure

```
qontrek-monorepo/
├── packages/
│   ├── core/           # Types, CFO, Vocabulary Guard
│   ├── civos/          # Classification Engine
│   └── solar-worker/   # Quote Generator
└── apps/
    └── solar-demo/     # Next.js app
```

## Deploy

Connected to Vercel - auto-deploys on push.

---

Powered by **Qontrek CIVOS v1.0.0**
