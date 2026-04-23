export interface ScanReport {
  riskScore: number
  riskLevel: string
  summary: string
  extType: string
  permissions: {
    detected: string[]
    dangerous: string[]
    rationale: string
  }
  attackSurfaces: {
    icon: string
    name: string
    detail: string
    risk: string
  }[]
  vulnerabilities: Vulnerability[]
  counts: { critical: number; high: number; medium: number; low: number; info: number }
  recommendations: string[]
  complianceNotes: string
  _meta: {
    model: string
    modelLabel: string
    scannedAt: string
    tokensUsed: number
  }
}

export interface Vulnerability {
  id: string
  name: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
  cwe: string
  cvss: number
  description: string
  codeSnippet: string
  offensiveDetails: string
  defensiveDetails: string
  references: string[]
}

export type Track = 'offensive' | 'defensive' | 'both'
export type ModelKey = 'opus-4.7' | 'sonnet-4.6' | 'haiku-4.5' | 'mythos'
export type Depth = 'quick' | 'standard' | 'deep'
