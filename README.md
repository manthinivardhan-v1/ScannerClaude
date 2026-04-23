# 🛡 ExtShield AI — Extension Vulnerability Scanner

AI-powered browser extension & plugin security scanner with **offensive** and **defensive** analysis tracks, powered by Claude Opus 4.7, Sonnet 4.6, Haiku 4.5, and Mythos Preview.

---

## Features

- **Multi-model support**: Switch between Claude Opus 4.7 (deepest), Sonnet 4.6 (recommended), Haiku 4.5 (fastest)
- **Claude Mythos Preview**: Shown as locked — defensive cybersecurity research model (invite-only via Project Glasswing)
- **Dual-track analysis**: Offensive (exploit chains, PoC, CVSS) + Defensive (code fixes, hardening, CSP)
- **Scan depth**: Quick triage / Standard / Deep (6-10+ findings)
- **Attack surface mapping**: Permissions, content scripts, message passing, storage, APIs
- **CWE + CVSS scoring** per vulnerability
- **Compliance notes**: OWASP, Chrome Extension Security Policy, CSP
- **JSON export** for reporting
- **4 built-in samples**: Dangerous manifest, data exfil script, eval/XSS background, VS Code plugin
- **Vercel-ready** with 60s API timeout

---

## Quick Start (Local)

```bash
# 1. Clone and install
git clone https://github.com/your-org/extshield-ai
cd extshield-ai
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key:
# ANTHROPIC_API_KEY=sk-ant-...

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A — Vercel CLI (recommended)
```bash
npm install -g vercel
vercel login
vercel

# Set your API key as a secret:
vercel env add ANTHROPIC_API_KEY
# Paste your key, select all environments

# Deploy to production:
vercel --prod
```

### Option B — Vercel Dashboard
1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Click **Deploy**

That's it — Vercel auto-detects Next.js.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key from [console.anthropic.com](https://console.anthropic.com) | ✅ Yes |

---

## Models Used

| Model | API String | Use Case |
|-------|-----------|----------|
| Claude Opus 4.7 | `claude-opus-4-7` | Most capable, deep agentic security analysis |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Recommended — frontier intelligence at scale |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest, near-frontier, quick triage |
| Claude Mythos | Invite-only | Defensive cybersecurity research (Project Glasswing) |

> **Note on Mythos**: Claude Mythos Preview is a research preview model for defensive cybersecurity workflows, available only to invited organizations as part of Project Glasswing. The UI shows it as locked. If you have access, add the model string and unlock it in `lib/types.ts` and `app/api/scan/route.ts`.

---

## Project Structure

```
extshield-ai/
├── app/
│   ├── api/scan/route.ts   # API route — calls Anthropic, returns JSON report
│   ├── page.tsx            # Main UI
│   ├── layout.tsx          # App shell + metadata
│   └── globals.css         # Dark theme styles
├── lib/
│   ├── types.ts            # TypeScript types
│   └── samples.ts          # Built-in vulnerable extension samples
├── vercel.json             # Vercel deployment config (60s API timeout)
├── .env.example            # Environment variable template
└── README.md
```

---

## Extending for Production

- **CRX unpacker**: Add a pre-processing step that unzips `.crx` files and extracts `manifest.json` + JS files before passing to the scanner
- **Batch scanning**: Use Anthropic's Message Batches API for scanning multiple extensions simultaneously
- **Chrome Web Store integration**: Fetch extension source by ID and auto-populate the code input
- **CI/CD integration**: Call `/api/scan` from your pipeline to gate extension PRs
- **CVE cross-reference**: Post-process findings against NVD/CVE database
- **SARIF output**: Export results in SARIF format for GitHub Security integration

---

## Security Note

This tool is for **authorized security research and defensive purposes only**. Do not use to analyze extensions you do not own or have permission to test.

---

Built with Next.js 14 · Anthropic Claude API · TypeScript
