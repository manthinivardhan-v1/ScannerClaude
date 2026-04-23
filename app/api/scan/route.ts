import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL_IDS: Record<string, string> = {
  'opus-4.7':   'claude-opus-4-7',
  'sonnet-4.6': 'claude-sonnet-4-6',
  'haiku-4.5':  'claude-haiku-4-5-20251001',
}

function buildPrompt(code: string, extType: string, extName: string, extContext: string, track: string, depth: string): string {
  const trackInstruction =
    track === 'offensive'
      ? 'Focus on offensive findings: real exploit chains, attacker methodology, CVSS scoring, PoC descriptions, lateral movement potential, and data exfiltration impact.'
      : track === 'defensive'
      ? 'Focus on defensive hardening: exact code fixes, secure patterns, CSP improvements, permission minimization, and compliance notes.'
      : 'Dual-track analysis: for each vulnerability provide BOTH offensive exploitation detail AND defensive remediation steps.'

  const depthInstruction =
    depth === 'deep'
      ? 'Perform DEEP analysis: enumerate every subtle issue including logic flaws, timing attacks, prototype pollution, supply chain risks, and CSP bypasses. Find at least 6-10 issues.'
      : depth === 'quick'
      ? 'Quick triage: flag only Critical and High severity issues. Be concise.'
      : 'Standard analysis: cover all severity levels with clear technical detail.'

  return `You are an elite browser extension security researcher. You specialize in finding real, exploitable vulnerabilities in browser extensions, VS Code plugins, and web plugins.

Extension: "${extName}" | Type: ${extType} | Context: ${extContext}
Track: ${track.toUpperCase()} | Depth: ${depth.toUpperCase()}

${trackInstruction}
${depthInstruction}

ANALYZE THIS SOURCE CODE:
\`\`\`
${code.substring(0, 10000)}
\`\`\`

Return ONLY valid JSON (no markdown fences, no explanation outside the JSON):
{
  "riskScore": <0-100>,
  "riskLevel": "<Critical|High|Medium|Low|Minimal>",
  "summary": "<2-sentence executive summary>",
  "extType": "${extType}",
  "permissions": {
    "detected": ["<all permissions found>"],
    "dangerous": ["<dangerous subset>"],
    "rationale": "<why these permissions are risky>"
  },
  "attackSurfaces": [
    { "icon": "<single emoji>", "name": "<surface>", "detail": "<1 sentence technical detail>", "risk": "<High|Medium|Low>" }
  ],
  "vulnerabilities": [
    {
      "id": "vuln-<N>",
      "name": "<vulnerability name>",
      "severity": "<Critical|High|Medium|Low|Info>",
      "cwe": "<CWE-XXX>",
      "cvss": <0.0-10.0>,
      "description": "<clear 2-3 sentence technical description>",
      "codeSnippet": "<relevant code snippet if found, or empty string>",
      "offensiveDetails": "<attacker PoC, exploit chain, impact — 3-4 sentences>",
      "defensiveDetails": "<exact fix, secure pattern, hardening — 3-4 sentences>",
      "references": ["<CWE/OWASP/CVE reference URL>"]
    }
  ],
  "counts": { "critical": <n>, "high": <n>, "medium": <n>, "low": <n>, "info": <n> },
  "recommendations": ["<top 3-5 prioritized action items>"],
  "complianceNotes": "<brief note on OWASP, Chrome Extension security policy, or CSP compliance>"
}`
}

export async function POST(req: NextRequest) {
  try {
    const { code, extType, extName, extContext, track, model, depth } = await req.json()

    if (!code?.trim()) {
      return NextResponse.json({ error: 'No source code provided' }, { status: 400 })
    }

    const modelId = MODEL_IDS[model] || MODEL_IDS['sonnet-4.6']
    const prompt = buildPrompt(code, extType || 'Chrome Extension', extName || 'Unknown', extContext || 'general', track || 'both', depth || 'standard')

    const message = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content.map((b: Anthropic.ContentBlock) => b.type === 'text' ? b.text : '').join('')
    const jsonStart = rawText.indexOf('{')
    const jsonEnd = rawText.lastIndexOf('}')

    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: 'Model returned invalid response', raw: rawText.substring(0, 500) }, { status: 500 })
    }

    const report = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1))
    report._meta = {
      model: modelId,
      modelLabel: model,
      scannedAt: new Date().toISOString(),
      tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
    }

    return NextResponse.json(report)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
