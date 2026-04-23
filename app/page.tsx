'use client'

import { useState, useRef } from 'react'
import type { ScanReport, Track, ModelKey, Depth } from '@/lib/types'
import { SAMPLES } from '@/lib/samples'

const SEVERITY_CONFIG = {
  Critical: { bg: '#450a0a', border: '#7f1d1d', text: '#fca5a5', dot: '#ef4444' },
  High:     { bg: '#431407', border: '#7c2d12', text: '#fdba74', dot: '#f97316' },
  Medium:   { bg: '#422006', border: '#78350f', text: '#fde68a', dot: '#eab308' },
  Low:      { bg: '#052e16', border: '#14532d', text: '#86efac', dot: '#22c55e' },
  Info:     { bg: '#172554', border: '#1e3a8a', text: '#93c5fd', dot: '#60a5fa' },
}

const MODELS: { key: ModelKey; label: string; tag: string; desc: string; locked?: boolean }[] = [
  { key: 'opus-4.7',   label: 'Claude Opus 4.7',   tag: 'MOST CAPABLE', desc: 'Deep reasoning, best for complex agentic security analysis' },
  { key: 'sonnet-4.6', label: 'Claude Sonnet 4.6',  tag: 'RECOMMENDED',  desc: 'Frontier intelligence at scale, great for most scans' },
  { key: 'haiku-4.5',  label: 'Claude Haiku 4.5',   tag: 'FASTEST',      desc: 'Near-frontier performance, ideal for quick triage' },
  { key: 'mythos',     label: 'Claude Mythos',       tag: 'INVITE ONLY',  desc: 'Research preview — defensive cybersecurity (Project Glasswing)', locked: true },
]

export default function Home() {
  const [code, setCode] = useState('')
  const [extType, setExtType] = useState('Chrome Extension')
  const [extName, setExtName] = useState('')
  const [extContext, setExtContext] = useState('')
  const [track, setTrack] = useState<Track>('both')
  const [model, setModel] = useState<ModelKey>('sonnet-4.6')
  const [depth, setDepth] = useState<Depth>('standard')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [report, setReport] = useState<ScanReport | null>(null)
  const [error, setError] = useState('')
  const [openVulns, setOpenVulns] = useState<Set<string>>(new Set())
  const [vulnTab, setVulnTab] = useState<Record<string, 'off' | 'def'>>({})
  const [activeTab, setActiveTab] = useState<'findings' | 'surfaces' | 'report'>('findings')
  const resultsRef = useRef<HTMLDivElement>(null)

  const toggleVuln = (id: string) => {
    setOpenVulns(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const loadSample = (key: string) => {
    const s = SAMPLES[key]
    if (s) {
      setCode(s.code)
      setExtType(s.type)
      setExtName(s.label)
    }
  }

  const runScan = async () => {
    if (!code.trim()) { setError('Paste extension source code first.'); return }
    setLoading(true)
    setError('')
    setReport(null)
    setOpenVulns(new Set())

    const steps = ['Initializing scanner...', 'Parsing extension structure...', 'Running AI security analysis...', 'Mapping attack surfaces...', 'Generating findings...']
    let i = 0
    setStatusMsg(steps[0])
    const interval = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1)
      setStatusMsg(steps[i])
    }, 1800)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, extType, extName, extContext, track, model, depth }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      setReport(data)
      setActiveTab('findings')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      clearInterval(interval)
      setLoading(false)
      setStatusMsg('')
    }
  }

  const exportJSON = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `extshield-${Date.now()}.json`
    a.click()
  }

  const scoreColor = (s: number) => s >= 80 ? '#ef4444' : s >= 60 ? '#f97316' : s >= 40 ? '#eab308' : '#22c55e'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #c9184a, #ff4d6d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🛡</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>ExtShield AI</h1>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginTop: 2 }}>browser extension · plugin · vulnerability scanner</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: '#1a0a0f', color: '#ff4d6d', border: '1px solid #3d0a17' }}>OFFENSIVE</span>
          <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: '#0a1a14', color: '#10b981', border: '1px solid #065f46' }}>DEFENSIVE</span>
        </div>
      </div>

      {/* Model Selector */}
      <div style={{ marginBottom: 20 }}>
        <Label>AI Model</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MODELS.map(m => (
            <button
              key={m.key}
              onClick={() => !m.locked && setModel(m.key)}
              style={{
                padding: '10px 10px 12px',
                borderRadius: 10,
                border: `1px solid ${model === m.key && !m.locked ? '#c9184a' : '#1e293b'}`,
                background: model === m.key && !m.locked ? '#1a0a0f' : '#111827',
                cursor: m.locked ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: m.locked ? 0.6 : 1,
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: m.locked ? '#64748b' : model === m.key ? '#ff4d6d' : '#475569', marginBottom: 4 }}>{m.tag}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: m.locked ? '#475569' : model === m.key ? '#f1f5f9' : '#94a3b8', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#334155', lineHeight: 1.4 }}>{m.desc}</div>
              {m.locked && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 12 }}>🔒</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Track + Depth Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <Label>Analysis Track</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['offensive', 'defensive', 'both'] as Track[]).map(t => (
              <button
                key={t}
                onClick={() => setTrack(t)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${track === t ? (t === 'defensive' ? '#065f46' : '#c9184a') : '#1e293b'}`,
                  background: track === t ? (t === 'defensive' ? '#0a1a14' : '#1a0a0f') : '#111827',
                  color: track === t ? (t === 'defensive' ? '#10b981' : '#ff4d6d') : '#475569',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {t === 'offensive' ? '⚔ Offensive' : t === 'defensive' ? '🛡 Defensive' : '⚡ Full'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Scan Depth</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['quick', 'standard', 'deep'] as Depth[]).map(d => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${depth === d ? '#334155' : '#1e293b'}`,
                  background: depth === d ? '#1e293b' : '#111827',
                  color: depth === d ? '#e2e8f0' : '#475569',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {d === 'quick' ? '⚡ Quick' : d === 'standard' ? '🔍 Standard' : '🔬 Deep'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Samples */}
      <div style={{ marginBottom: 12 }}>
        <Label>Quick Load Sample</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(SAMPLES).map(([key, s]) => (
            <button
              key={key}
              onClick={() => loadSample(key)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', border: '1px solid #1e293b', background: '#0d1424', color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseOver={e => { (e.target as HTMLElement).style.borderColor = '#334155'; (e.target as HTMLElement).style.color = '#94a3b8' }}
              onMouseOut={e => { (e.target as HTMLElement).style.borderColor = '#1e293b'; (e.target as HTMLElement).style.color = '#64748b' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {['Chrome Extension', 'Firefox Add-on', 'VS Code Plugin', 'Browser Plugin', 'NPM Package'].map(t => (
            <button
              key={t}
              onClick={() => setExtType(t)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', border: `1px solid ${extType === t ? '#4338ca' : '#1e293b'}`, background: extType === t ? '#1e1b4b' : 'transparent', color: extType === t ? '#818cf8' : '#475569', cursor: 'pointer' }}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={'// Paste manifest.json, background.js, content_scripts.js...\n// Or load a sample above ↑\n\n{\n  "manifest_version": 3,\n  "permissions": ["tabs", "storage"],\n  ...\n}'}
          style={{ width: '100%', minHeight: 200, background: '#0d1424', border: '1px solid #1e293b', borderRadius: 8, color: '#a5f3fc', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, padding: 12, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={extName} onChange={e => setExtName(e.target.value)} placeholder="Extension name (optional)" style={{ flex: 1, padding: '7px 10px', background: '#0d1424', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, outline: 'none' }} />
          <input value={extContext} onChange={e => setExtContext(e.target.value)} placeholder="Context: banking, devtools, productivity..." style={{ flex: 2, padding: '7px 10px', background: '#0d1424', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, outline: 'none' }} />
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={runScan}
        disabled={loading}
        style={{
          width: '100%', padding: 15, borderRadius: 10, border: 'none',
          background: loading ? '#1e293b' : track === 'defensive' ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #c9184a, #ff4d6d)',
          color: loading ? '#475569' : 'white', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', letterSpacing: 0.3,
        }}
      >
        {loading ? `⏳ ${statusMsg}` : track === 'defensive' ? '🛡 Launch Defensive Analysis' : track === 'offensive' ? '⚔ Launch Vulnerability Scan' : '⚡ Launch Full Security Analysis'}
      </button>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          ✗ {error}
        </div>
      )}

      {/* Results */}
      {report && (
        <div ref={resultsRef} style={{ marginTop: 28 }} className="animate-scan-in">

          {/* Meta bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 12px', background: '#0d1424', border: '1px solid #1e293b', borderRadius: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569' }}>Scanned with</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#818cf8', fontWeight: 700 }}>{report._meta?.modelLabel}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1e293b' }}>|</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569' }}>{new Date(report._meta?.scannedAt).toLocaleString()}</span>
            {report._meta?.tokensUsed && (
              <>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1e293b' }}>|</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#334155' }}>{report._meta.tokensUsed.toLocaleString()} tokens</span>
              </>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={exportJSON} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, cursor: 'pointer' }}>⬇ Export JSON</button>
            </div>
          </div>

          {/* Risk score + summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#111827', border: `2px solid ${scoreColor(report.riskScore)}33`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', letterSpacing: 1 }}>RISK SCORE</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 48, fontWeight: 800, color: scoreColor(report.riskScore), lineHeight: 1 }}>{report.riskScore}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: scoreColor(report.riskScore), fontWeight: 700 }}>{report.riskLevel?.toUpperCase()}</div>
              <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${report.riskScore}%`, height: '100%', background: scoreColor(report.riskScore), borderRadius: 2, transition: 'width 1s ease' }} />
              </div>
            </div>
            <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginBottom: 8, letterSpacing: 1 }}>EXECUTIVE SUMMARY</div>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>{report.summary}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => (
                  <div key={sev} style={{ textAlign: 'center', padding: '8px 4px', background: '#0d1424', borderRadius: 8, border: `1px solid ${SEVERITY_CONFIG[sev.charAt(0).toUpperCase() + sev.slice(1) as keyof typeof SEVERITY_CONFIG]?.border || '#1e293b'}` }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: SEVERITY_CONFIG[sev.charAt(0).toUpperCase() + sev.slice(1) as keyof typeof SEVERITY_CONFIG]?.dot || '#64748b' }}>{report.counts?.[sev] || 0}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#475569', marginTop: 2, letterSpacing: 0.5 }}>{sev.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b', marginBottom: 14 }}>
            {(['findings', 'surfaces', 'report'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '10px', background: activeTab === tab ? '#1e293b' : '#111827', color: activeTab === tab ? '#e2e8f0' : '#475569', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', letterSpacing: 0.3 }}
              >
                {tab === 'findings' ? `⚠ Findings (${report.vulnerabilities?.length || 0})` : tab === 'surfaces' ? '🗺 Attack Surfaces' : '📋 Full Report'}
              </button>
            ))}
          </div>

          {/* Findings Tab */}
          {activeTab === 'findings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {report.vulnerabilities?.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>No significant vulnerabilities detected.</div>
              )}
              {report.vulnerabilities?.map(v => {
                const sc = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.Info
                const isOpen = openVulns.has(v.id)
                const tab = vulnTab[v.id] || 'off'
                return (
                  <div key={v.id} style={{ background: '#111827', border: `1px solid ${isOpen ? sc.border : '#1e293b'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <div onClick={() => toggleVuln(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, flexShrink: 0 }}>{v.severity}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{v.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#334155' }}>{v.cwe}</span>
                      {v.cvss > 0 && <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>CVSS {v.cvss.toFixed(1)}</span>}
                      <span style={{ color: '#334155', fontSize: 11, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1e293b' }}>
                        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, margin: '12px 0 10px' }}>{v.description}</p>
                        {v.codeSnippet && (
                          <pre style={{ background: '#0d1424', border: '1px solid #1e293b', borderRadius: 6, padding: 10, fontSize: 11, color: '#a5f3fc', overflow: 'auto', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>{v.codeSnippet}</pre>
                        )}
                        <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #1e293b', marginBottom: 10, width: 'fit-content' }}>
                          {(['off', 'def'] as const).map(t => (
                            <button key={t} onClick={() => setVulnTab(prev => ({ ...prev, [v.id]: t }))} style={{ padding: '5px 14px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', background: tab === t ? '#1e293b' : '#0d1424', color: tab === t ? '#e2e8f0' : '#475569', border: 'none', cursor: 'pointer' }}>
                              {t === 'off' ? '⚔ Offensive' : '🛡 Defensive'}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7, color: tab === 'off' ? '#fca5a5' : '#6ee7b7', background: '#0d1424', borderRadius: 6, padding: '10px 12px', border: '1px solid #1e293b', whiteSpace: 'pre-wrap' }}>
                          {tab === 'off' ? v.offensiveDetails : v.defensiveDetails}
                        </div>
                        {v.references?.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {v.references.map((ref, i) => (
                              <a key={i} href={ref} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa', padding: '3px 8px', background: '#172554', borderRadius: 4, border: '1px solid #1e3a8a', textDecoration: 'none' }}>{ref.replace('https://', '')}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Attack Surfaces Tab */}
          {activeTab === 'surfaces' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Permissions */}
              {report.permissions?.detected?.length > 0 && (
                <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>Detected Permissions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {report.permissions.detected.map(p => {
                      const isDangerous = report.permissions.dangerous?.includes(p)
                      return (
                        <span key={p} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', background: isDangerous ? '#450a0a' : '#0d1424', border: `1px solid ${isDangerous ? '#7f1d1d' : '#1e293b'}`, color: isDangerous ? '#fca5a5' : '#94a3b8' }}>{p}</span>
                      )
                    })}
                  </div>
                  {report.permissions.rationale && <p style={{ fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>{report.permissions.rationale}</p>}
                </div>
              )}

              {/* Attack surface grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {report.attackSurfaces?.map((s, i) => (
                  <div key={i} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{s.name}</span>
                        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: s.risk === 'High' ? '#450a0a' : s.risk === 'Medium' ? '#422006' : '#052e16', color: s.risk === 'High' ? '#fca5a5' : s.risk === 'Medium' ? '#fde68a' : '#86efac', border: `1px solid ${s.risk === 'High' ? '#7f1d1d' : s.risk === 'Medium' ? '#78350f' : '#14532d'}` }}>{s.risk}</span>
                      </div>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Report Tab */}
          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginBottom: 10, letterSpacing: 0.8 }}>RECOMMENDATIONS</div>
                {report.recommendations?.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 10px', background: '#0d1424', borderRadius: 6, border: '1px solid #1e293b' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#475569', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{r}</span>
                  </div>
                ))}
              </div>
              {report.complianceNotes && (
                <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginBottom: 8, letterSpacing: 0.8 }}>COMPLIANCE NOTES</div>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{report.complianceNotes}</p>
                </div>
              )}
              <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginBottom: 10, letterSpacing: 0.8 }}>RAW JSON REPORT</div>
                <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b', overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{JSON.stringify(report, null, 2)}</pre>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#475569', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}
