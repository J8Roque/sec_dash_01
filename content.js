window.CONTENT = {
  app: {
    name: "CyberShield",
    version: "SOC v2.4.1",
    subtitle: "Real time threat monitoring and analysis"
  },

  dashboard: {
    incidentsWeek: { value: 286, deltaPct: 15 },
    newIncidents: { value: 251, deltaPct: 7 },
    modelsMonthly: { value: 64, note: "Stable" },
    anomaliesDonut: { flagged: 38, notFlagged: 62 }
  },

  riskyUsers: [
    { name: "A. Rivera", dept: "Finance", risk: 100 },
    { name: "M. Chen", dept: "Operations", risk: 97 },
    { name: "S. Patel", dept: "HR", risk: 95 },
    { name: "J. Nguyen", dept: "Support", risk: 93 },
    { name: "K. Gomez", dept: "Sales", risk: 90 }
  ],

  anomaliesQueue: [
    { name: "Office 365 exchange", meta: "High volume", value: 603 },
    { name: "G Suite sign in", meta: "Suspicious source", value: 195 },
    { name: "Microsoft Defender", meta: "Endpoint signals", value: 136 },
    { name: "Office 365 message", meta: "Attachment flagged", value: 125 }
  ],

  indicators: [
    { name: "Malware", weight: 92 },
    { name: "Ransomware", weight: 76 },
    { name: "Threat intel", weight: 58 },
    { name: "UEBA", weight: 44 }
  ],

  threatTemplates: [
    { sev: "critical", msg: "Possible ransomware behavior detected", src: "EDR", hint: "Isolate host and start incident playbook" },
    { sev: "high", msg: "Suspicious PowerShell execution pattern", src: "SIEM", hint: "Review command line and parent process" },
    { sev: "high", msg: "Multiple failed MFA prompts detected", src: "IdP", hint: "Check push fatigue and enforce number matching" },
    { sev: "medium", msg: "Phishing email reported by user", src: "Mailbox", hint: "Quarantine and hunt similar messages" },
    { sev: "medium", msg: "New admin role assignment", src: "IAM", hint: "Validate approval and access scope" },
    { sev: "low", msg: "New device enrolled", src: "MDM", hint: "Confirm compliance and encryption" },
    { sev: "low", msg: "DNS anomaly resolved", src: "NetOps", hint: "Monitor recurrence" }
  ],

  scanFindings: {
    base: [
      { sev: "high", title: "Missing HTTP security headers", detail: "CSP or related headers not consistent.", remed: "Set headers at proxy or app and validate in CI." },
      { sev: "medium", title: "TLS configuration could be hardened", detail: "Legacy cipher flagged (simulated).", remed: "Prefer TLS 1.2 or 1.3 and disable legacy suites." },
      { sev: "medium", title: "Outdated dependency detected", detail: "A library version appears behind (simulated).", remed: "Patch, pin versions, enable Dependabot, test." },
      { sev: "low", title: "Verbose server banner", detail: "Version detail aids fingerprinting (simulated).", remed: "Remove banners and reduce error detail in production." },
      { sev: "high", title: "Weak authentication policy risk", detail: "Policy allows higher risk behavior (simulated).", remed: "Enforce MFA, lockouts, and risk based controls." }
    ],
    cloud: [
      { sev: "high", title: "Cloud storage access review needed", detail: "Public access controls may be open (simulated).", remed: "Audit policies, least privilege, enable logging." }
    ],
    internal: [
      { sev: "medium", title: "Lateral movement exposure", detail: "Segmentation appears permissive (simulated).", remed: "Segment, restrict admin shares, monitor east west traffic." }
    ],
    deep: [
      { sev: "critical", title: "Credential reuse indicator", detail: "Simulated signal suggests reused credentials.", remed: "Force reset, investigate sign ins, deploy MFA." }
    ]
  }
};
