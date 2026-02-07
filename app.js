/* CyberShield SOC demo
   Static SPA, safe simulated tools, GitHub Pages friendly.
*/

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "cybershield_soc_v1";

const state = {
  paused: false,
  theme: "dark",
  metrics: {
    blocked: 0,
    alerts: 0,
    patch: 92,
    auth: 96
  },
  severityCounts: { critical: 1, high: 2, medium: 3, low: 4 },
  threats: [],
  scan: { running: false, progress: 0, results: [] },
  network: { spike: 0 },
  systems: 847
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function nowUtcString() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    if (saved.theme) state.theme = saved.theme;
    if (saved.threats) state.threats = saved.threats.slice(0, 60);
    if (saved.severityCounts) state.severityCounts = saved.severityCounts;
    if (typeof saved.systems === "number") state.systems = saved.systems;
  } catch {
    // ignore
  }
}
function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      theme: state.theme,
      threats: state.threats.slice(0, 60),
      severityCounts: state.severityCounts,
      systems: state.systems
    })
  );
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  $("btnTheme").textContent = theme === "light" ? "☀️" : "🌙";
  saveState();
  refreshChartTheme();
}

/* Navigation */
function setView(view) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));

  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add("active");
  $(`view-${view}`)?.classList.add("active");
}
document.addEventListener("click", (e) => {
  const item = e.target.closest(".nav-item");
  if (!item) return;
  setView(item.dataset.view);
});

/* Charts */
let chartSeverity = null;
let chartEvents = null;
let chartPps = null;
let chartMbps = null;

const eventLabels = [];
const eventSeries = [];
const netLabels = [];
const ppsSeries = [];
const mbpsSeries = [];

function pushRolling(labels, series, label, value, max = 60) {
  labels.push(label);
  series.push(value);
  while (labels.length > max) labels.shift();
  while (series.length > max) series.shift();
}

function initCharts() {
  const sevCtx = $("chartSeverity").getContext("2d");
  chartSeverity = new Chart(sevCtx, {
    type: "doughnut",
    data: {
      labels: ["Critical", "High", "Medium", "Low"],
      datasets: [
        {
          data: [
            state.severityCounts.critical,
            state.severityCounts.high,
            state.severityCounts.medium,
            state.severityCounts.low
          ]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: getComputedStyle(document.body).color } } }
    }
  });

  const evtCtx = $("chartEvents").getContext("2d");
  chartEvents = new Chart(evtCtx, {
    type: "line",
    data: {
      labels: eventLabels,
      datasets: [{ label: "Events", data: eventSeries, tension: 0.25 }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).color } },
        y: { ticks: { color: getComputedStyle(document.body).color } }
      },
      plugins: { legend: { labels: { color: getComputedStyle(document.body).color } } }
    }
  });

  const ppsCtx = $("chartPps").getContext("2d");
  chartPps = new Chart(ppsCtx, {
    type: "line",
    data: { labels: netLabels, datasets: [{ label: "Packets/sec", data: ppsSeries, tension: 0.25 }] },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).color } },
        y: { ticks: { color: getComputedStyle(document.body).color } }
      },
      plugins: { legend: { labels: { color: getComputedStyle(document.body).color } } }
    }
  });

  const mbpsCtx = $("chartMbps").getContext("2d");
  chartMbps = new Chart(mbpsCtx, {
    type: "line",
    data: { labels: netLabels, datasets: [{ label: "Mbps", data: mbpsSeries, tension: 0.25 }] },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: { ticks: { color: getComputedStyle(document.body).color } },
        y: { ticks: { color: getComputedStyle(document.body).color } }
      },
      plugins: { legend: { labels: { color: getComputedStyle(document.body).color } } }
    }
  });
}

function refreshChartTheme() {
  const color = getComputedStyle(document.body).color;
  [chartSeverity, chartEvents, chartPps, chartMbps].forEach((ch) => {
    if (!ch) return;
    if (ch.options?.plugins?.legend?.labels) ch.options.plugins.legend.labels.color = color;
    if (ch.options?.scales?.x?.ticks) ch.options.scales.x.ticks.color = color;
    if (ch.options?.scales?.y?.ticks) ch.options.scales.y.ticks.color = color;
    ch.update();
  });
}

function updateSeverityChart() {
  if (!chartSeverity) return;
  chartSeverity.data.datasets[0].data = [
    state.severityCounts.critical,
    state.severityCounts.high,
    state.severityCounts.medium,
    state.severityCounts.low
  ];
  chartSeverity.update();
}

/* Threat feed */
const THREAT_TEMPLATES = [
  { sev: "critical", msg: "Possible ransomware behavior detected", src: "EDR", hint: "Isolate host, confirm backups" },
  { sev: "high", msg: "Suspicious PowerShell execution pattern", src: "SIEM", hint: "Review command line and parent" },
  { sev: "high", msg: "Multiple failed MFA prompts", src: "IdP", hint: "Check push fatigue, enforce number matching" },
  { sev: "medium", msg: "Phishing email reported by user", src: "Mailbox", hint: "Quarantine and hunt similar" },
  { sev: "medium", msg: "New admin role assignment", src: "IAM", hint: "Validate approval trail" },
  { sev: "low", msg: "New device enrolled", src: "MDM", hint: "Confirm compliance and encryption" },
  { sev: "low", msg: "DNS anomaly resolved", src: "NetOps", hint: "Monitor recurrence" }
];

function severityLabel(sev) {
  if (sev === "critical") return "Critical";
  if (sev === "high") return "High";
  if (sev === "medium") return "Medium";
  return "Low";
}

function addThreat(custom = null) {
  const t = custom || THREAT_TEMPLATES[randInt(0, THREAT_TEMPLATES.length - 1)];
  const item = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    time: nowUtcString(),
    sev: t.sev,
    msg: t.msg,
    src: t.src,
    hint: t.hint,
    status: "Open"
  };

  state.threats.unshift(item);
  state.threats = state.threats.slice(0, 60);

  state.severityCounts[item.sev] = (state.severityCounts[item.sev] || 0) + 1;
  state.metrics.alerts = state.threats.filter((x) => x.status === "Open").length;

  saveState();
  renderThreats();
  updateSeverityChart();
  renderKpis();
}

function closeThreat(id) {
  const t = state.threats.find((x) => x.id === id);
  if (!t) return;
  t.status = "Closed";
  state.metrics.alerts = state.threats.filter((x) => x.status === "Open").length;
  saveState();
  renderThreats();
  renderKpis();
}

function renderThreats() {
  const filter = $("threatFilter")?.value || "all";
  const q = ($("threatSearch")?.value || "").trim().toLowerCase();

  const list = $("threatList");
  if (!list) return;
  list.innerHTML = "";

  const items = state.threats.filter((t) => {
    const matchSev = filter === "all" ? true : t.sev === filter;
    const matchQ = q ? (t.msg + " " + t.src + " " + t.hint).toLowerCase().includes(q) : true;
    return matchSev && matchQ;
  });

  $("threatEmpty").style.display = items.length ? "none" : "block";

  for (const t of items) {
    const div = document.createElement("div");
    div.className = "threat";

    const tag = document.createElement("div");
    tag.className = `tag ${t.sev}`;
    tag.textContent = severityLabel(t.sev);

    const body = document.createElement("div");
    body.innerHTML = `
      <div class="msg">${escapeHtml(t.msg)} ${t.status === "Closed" ? `<span class="muted">(closed)</span>` : ""}</div>
      <div class="meta">${escapeHtml(t.time)} • ${escapeHtml(t.src)} • Tip: ${escapeHtml(t.hint)}</div>
    `;

    const btn = document.createElement("button");
    btn.className = "btn btn-ghost";
    btn.textContent = t.status === "Closed" ? "Closed" : "Close";
    btn.disabled = t.status === "Closed";
    btn.addEventListener("click", () => closeThreat(t.id));

    div.appendChild(tag);
    div.appendChild(body);
    div.appendChild(btn);
    list.appendChild(div);
  }
}

/* Scanner simulation */
function simulateFindings(profile, scope) {
  const base = [
    { sev: "high", title: "Missing HTTP security headers", detail: "CSP or related headers not consistent.", remed: "Set headers at proxy or app and validate in CI." },
    { sev: "medium", title: "TLS configuration could be hardened", detail: "Legacy ciphers flagged (simulated).", remed: "Prefer TLS 1.2/1.3, disable legacy suites, enable HSTS." },
    { sev: "medium", title: "Outdated dependency detected", detail: "A library version appears behind (simulated).", remed: "Patch, pin versions, enable Dependabot, test." },
    { sev: "low", title: "Verbose server banner", detail: "Version detail aids fingerprinting (simulated).", remed: "Remove banners, reduce error detail in prod." },
    { sev: "high", title: "Weak authentication policy risk", detail: "Policy allows higher risk behavior (simulated).", remed: "Enforce MFA, lockouts, and risk based controls." }
  ];

  const extras = [];
  if (scope === "cloud") extras.push({ sev: "high", title: "Cloud storage access review needed", detail: "Public access controls may be open (simulated).", remed: "Audit policies, least privilege, enable logging." });
  if (scope === "internal") extras.push({ sev: "medium", title: "Lateral movement exposure", detail: "Segmentation appears permissive (simulated).", remed: "Segment, restrict admin shares, monitor east west." });
  if (profile === "deep") extras.push({ sev: "critical", title: "Credential reuse indicator", detail: "Simulated signal suggests reused credentials.", remed: "Force reset, investigate sign-ins, deploy MFA." });

  const all = base.concat(extras);
  const count = profile === "quick" ? 3 : profile === "standard" ? 5 : Math.min(7, all.length);
  return all.sort(() => Math.random() - 0.5).slice(0, count);
}

function renderScanResults() {
  const wrap = $("scanResults");
  if (!wrap) return;

  const results = state.scan.results;
  if (!results.length) {
    wrap.className = "empty";
    wrap.textContent = "No results yet. Start a scan.";
    return;
  }

  wrap.className = "";
  wrap.innerHTML = "";

  for (const f of results) {
    const div = document.createElement("div");
    div.className = "finding";
    div.innerHTML = `
      <div class="tag ${f.sev}">${escapeHtml(f.sev.toUpperCase())}</div>
      <div>
        <div class="msg">${escapeHtml(f.title)}</div>
        <div class="meta muted">${escapeHtml(f.detail)}</div>
        <div class="meta muted">Remediation: ${escapeHtml(f.remed)}</div>
      </div>
    `;
    wrap.appendChild(div);
  }
}

function startScan() {
  if (state.scan.running) return;

  const target = ($("scanTarget").value || "").trim() || "Unnamed asset";
  const profile = $("scanProfile").value;
  const scope = $("scanScope").value;

  state.scan.running = true;
  state.scan.progress = 0;
  state.scan.results = [];

  $("scanStatus").textContent = `Starting simulated scan for: ${target}`;
  $("scanBar").style.width = "0%";
  renderScanResults();

  const durationMs = profile === "quick" ? 2000 : profile === "standard" ? 3500 : 5200;
  const stepMs = 120;
  const steps = Math.floor(durationMs / stepMs);

  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    const pct = clamp(Math.round((i / steps) * 100), 0, 100);
    state.scan.progress = pct;
    $("scanBar").style.width = `${pct}%`;

    if (pct < 30) $("scanStatus").textContent = "Checking baseline config...";
    else if (pct < 60) $("scanStatus").textContent = "Evaluating policy signals...";
    else if (pct < 90) $("scanStatus").textContent = "Correlating findings...";
    else $("scanStatus").textContent = "Finalizing...";

    if (i >= steps) {
      clearInterval(timer);
      state.scan.running = false;
      $("scanBar").style.width = "100%";
      $("scanStatus").textContent = "Scan complete (simulated).";

      state.scan.results = simulateFindings(profile, scope);
      renderScanResults();

      const top = state.scan.results[0];
      addThreat({
        sev: top.sev === "critical" ? "critical" : top.sev === "high" ? "high" : "medium",
        msg: `Scanner result: ${top.title}`,
        src: "Scanner",
        hint: "Review remediation and track in tickets"
      });
    }
  }, stepMs);
}

/* Password analyzer */
function estimateCrackTime(score) {
  if (score <= 0) return "Instant to minutes";
  if (score === 1) return "Minutes to hours";
  if (score === 2) return "Hours to days";
  if (score === 3) return "Days to months";
  return "Months to years";
}
function fallbackScore(pw) {
  let score = 0;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 16) score = Math.min(4, score + 1);
  return clamp(score, 0, 4);
}
function analyzePassword(pw) {
  if (!pw) {
    $("pwMeter").style.width = "0%";
    $("pwVerdict").textContent = "No input";
    $("pwScore").textContent = "Score: 0/4";
    $("pwFeedback").innerHTML = `<li class="muted">Type a password to see suggestions.</li>`;
    $("pwCrack").textContent = "Estimated crack time: N/A";
    return;
  }

  let score = 0;
  let feedback = [];
  let crack = "N/A";

  if (typeof window.zxcvbn === "function") {
    const res = window.zxcvbn(pw);
    score = res.score;
    crack = res.crack_times_display?.offline_fast_hashing_1e10_per_second || estimateCrackTime(score);
    if (res.feedback?.warning) feedback.push(res.feedback.warning);
    if (Array.isArray(res.feedback?.suggestions)) feedback = feedback.concat(res.feedback.suggestions);
  } else {
    score = fallbackScore(pw);
    crack = estimateCrackTime(score);
    feedback.push("Use a longer passphrase (multiple words).");
  }

  const pct = [10, 30, 55, 78, 100][score] || 10;
  $("pwMeter").style.width = `${pct}%`;
  $("pwScore").textContent = `Score: ${score}/4`;

  const verdict = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Strong" : "Very strong";
  $("pwVerdict").textContent = verdict;

  const unique = Array.from(new Set(feedback.filter(Boolean))).slice(0, 6);
  $("pwFeedback").innerHTML = unique.length ? unique.map((x) => `<li>${escapeHtml(x)}</li>`).join("") : `<li class="muted">No warnings. Looks solid.</li>`;
  $("pwCrack").textContent = `Estimated crack time: ${crack}`;
}

/* KPI rendering */
function renderKpis() {
  // Basic metrics already used by your app
  $("mBlocked").textContent = state.metrics.blocked.toLocaleString();
  $("mAlerts").textContent = state.metrics.alerts.toLocaleString();
  $("sbLiveCount").textContent = state.metrics.alerts.toLocaleString();

  const sev = state.threats.some((t) => t.status === "Open" && t.sev === "critical")
    ? "Critical"
    : state.threats.some((t) => t.status === "Open" && t.sev === "high")
      ? "High"
      : state.threats.some((t) => t.status === "Open" && t.sev === "medium")
        ? "Medium"
        : "Low";

  $("mAlertsSev").textContent = sev;

  const open = state.threats.filter((t) => t.status === "Open");
  const crit = open.filter((t) => t.sev === "critical").length;
  const med = open.filter((t) => t.sev === "medium").length;
  $("kThreatSummary").textContent = `${crit} critical, ${med} medium`;

  // Security score
  const score = clamp(Math.round((state.metrics.patch + state.metrics.auth) / 2 - state.metrics.alerts * 0.6), 0, 100);
  $("kSecurityScore").textContent = String(score);
  $("kSecurityBar").style.width = `${score}%`;

  // Threat bar scales with alerts
  const threatPct = clamp(state.metrics.alerts * 8, 0, 100);
  $("kThreatBar").style.width = `${threatPct}%`;

  // Blocked bar scales with blocked count
  const blockedPct = clamp(Math.round(state.metrics.blocked / 50), 0, 100);
  $("kBlockedBar").style.width = `${blockedPct}%`;

  // Systems
  $("kSystems").textContent = state.systems.toLocaleString();
}

/* Live loops */
function tickMetrics() {
  if (state.paused) return;

  state.metrics.blocked = clamp(state.metrics.blocked + randInt(0, 12), 0, 999999);
  state.metrics.patch = clamp(state.metrics.patch + randInt(-1, 1), 86, 99);
  state.metrics.auth = clamp(state.metrics.auth + randInt(-1, 1), 90, 99);

  // events
  pushRolling(eventLabels, eventSeries, nowUtcString().slice(11), randInt(8, 26), 60);
  chartEvents?.update();

  // occasional threat
  if (randInt(1, 100) <= 18) addThreat();

  renderKpis();
}

function tickNetwork() {
  if (state.paused) return;

  const spikeFactor = state.network.spike > 0 ? 1.8 : 1.0;
  const pps = Math.round((randInt(900, 1600) * spikeFactor) + randInt(-70, 70));
  const mbps = Math.round((randInt(40, 110) * spikeFactor) + randInt(-8, 8));

  pushRolling(netLabels, ppsSeries, nowUtcString().slice(11), Math.max(0, pps), 60);
  pushRolling(netLabels, mbpsSeries, nowUtcString().slice(11), Math.max(0, mbps), 60);

  if (state.network.spike > 0) state.network.spike -= 1;

  chartPps?.update();
  chartMbps?.update();
}

function updateClock() {
  const el = $("clock");
  if (!el) return;
  el.textContent = nowUtcString();
}

/* Export report */
function buildReport() {
  return {
    generatedAt: new Date().toISOString(),
    metrics: { ...state.metrics, systems: state.systems },
    severityCounts: { ...state.severityCounts },
    openThreats: state.threats.filter((t) => t.status === "Open").slice(0, 50),
    latestScan: state.scan.results.slice(0, 20),
    notes: ["Simulated demo data only, safe for public hosting."]
  };
}
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* UI bindings */
function bindUI() {
  $("btnTheme").addEventListener("click", () => setTheme(state.theme === "light" ? "dark" : "light"));

  $("btnExport").addEventListener("click", () => downloadJson("cybershield-report.json", buildReport()));

  $("btnPause").addEventListener("click", (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? "Resume Live" : "Pause Live";
    $("sbMode").textContent = state.paused ? "Paused" : "Live";
  });

  $("btnSimIncident").addEventListener("click", () => {
    addThreat({ sev: "critical", msg: "Simulated incident: suspicious encryption activity", src: "EDR", hint: "Isolate and start incident playbook" });
    state.metrics.blocked += randInt(40, 120);
    renderKpis();
  });

  $("btnClearAlerts").addEventListener("click", () => {
    state.threats.forEach((t) => (t.status = "Closed"));
    state.metrics.alerts = 0;
    saveState();
    renderThreats();
    renderKpis();
  });

  $("btnStartScan").addEventListener("click", startScan);

  $("pwInput").addEventListener("input", (e) => analyzePassword(e.target.value));
  $("btnTogglePw").addEventListener("click", () => {
    const input = $("pwInput");
    const isPw = input.type === "password";
    input.type = isPw ? "text" : "password";
    $("btnTogglePw").textContent = isPw ? "Hide" : "Show";
  });

  $("threatFilter").addEventListener("change", renderThreats);
  $("threatSearch").addEventListener("input", renderThreats);

  $("btnThreatPause").addEventListener("click", (e) => {
    state.paused = !state.paused;
    e.target.textContent = state.paused ? "Resume" : "Pause";
    $("btnPause").textContent = state.paused ? "Resume Live" : "Pause Live";
    $("sbMode").textContent = state.paused ? "Paused" : "Live";
  });

  $("btnThreatClear").addEventListener("click", () => {
    state.threats = [];
    state.metrics.alerts = 0;
    state.severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    saveState();
    renderThreats();
    updateSeverityChart();
    renderKpis();
  });

  $("btnNetSpike").addEventListener("click", () => {
    state.network.spike = 20;
    addThreat({ sev: "medium", msg: "Traffic anomaly spike detected (simulated)", src: "NetFlow", hint: "Validate sources, rate limit if needed" });
  });

  $("btnNetReset").addEventListener("click", () => {
    netLabels.length = 0;
    ppsSeries.length = 0;
    mbpsSeries.length = 0;
    chartPps?.update();
    chartMbps?.update();
  });
}

/* Boot */
function boot() {
  loadState();
  setTheme(state.theme);

  if (state.threats.length === 0) {
    addThreat({ sev: "medium", msg: "Baseline monitoring enabled", src: "SIEM", hint: "Review thresholds and dashboards" });
    addThreat({ sev: "low", msg: "MFA policy audit scheduled", src: "IAM", hint: "Confirm privileged coverage" });
  } else {
    state.metrics.alerts = state.threats.filter((t) => t.status === "Open").length;
  }

  for (let i = 0; i < 20; i += 1) {
    pushRolling(eventLabels, eventSeries, nowUtcString().slice(11), randInt(8, 20), 60);
    pushRolling(netLabels, ppsSeries, nowUtcString().slice(11), randInt(950, 1500), 60);
    pushRolling(netLabels, mbpsSeries, nowUtcString().slice(11), randInt(45, 100), 60);
  }

  initCharts();
  renderThreats();
  renderScanResults();
  renderKpis();
  bindUI();

  updateClock();
  setInterval(updateClock, 1000);
  setInterval(tickMetrics, 1200);
  setInterval(tickNetwork, 1000);
}

document.addEventListener("DOMContentLoaded", boot);
