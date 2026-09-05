import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, ArrowUpRight, Check, ChevronRight, CircleAlert, Clock3,
  Command, CreditCard, Filter, IndianRupee, LayoutDashboard, Link2,
  LockKeyhole, RefreshCw, Search, ShieldCheck, Sparkles, UserRound, X,
  Zap, Bell, Table2, UserCheck
} from "lucide-react";
import "./styles.css";

const initialCases = [
  { id: "pay_rahul", name: "Rahul Mehta", initials: "RM", email: "rahul.mehta@email.com", amount: 8499, status: "FAILED", reason: "insufficient_funds", attempts: 2, purchases: 4, activity: "High", age: "12 min ago", intent: 91, probability: 82, confidence: 89, risk: "LOW", action: "PAYMENT_LINK", reasonText: "Strong purchase history and repeated intent. A payment link gives the customer a safer path than another immediate retry.", paymentLink: null, recovered: false },
  { id: "pay_ananya", name: "Ananya Sharma", initials: "AS", email: "ananya.sharma@email.com", amount: 12999, status: "FAILED", reason: "network_error", attempts: 1, purchases: 7, activity: "High", age: "18 min ago", intent: 87, probability: 79, confidence: 92, risk: "LOW", action: "PAYMENT_LINK", reasonText: "A high-value repeat customer is likely to complete checkout when given a fresh payment route.", paymentLink: null, recovered: false, latestStatus: "CAPTURED" },
  { id: "pay_vikram", name: "Vikram Singh", initials: "VS", email: "vikram.singh@email.com", amount: 3499, status: "FAILED", reason: "card_declined", attempts: 3, purchases: 1, activity: "Medium", age: "34 min ago", intent: 58, probability: 44, confidence: 84, risk: "MEDIUM", action: "RETRY_LATER", reasonText: "Repeated failures increase friction. Wait before trying again to avoid unnecessary declines.", paymentLink: null, recovered: false },
  { id: "pay-priya", name: "Priya Nair", initials: "PN", email: "priya.nair@email.com", amount: 2199, status: "FAILED", reason: "timeout", attempts: 1, purchases: 2, activity: "Medium", age: "51 min ago", intent: 72, probability: 65, confidence: 81, risk: "LOW", action: "REMINDER", reasonText: "The checkout timed out with positive intent. A lightweight reminder is the safest next step.", paymentLink: null, recovered: false },
  { id: "pay-arjun", name: "Arjun Kapoor", initials: "AK", email: "arjun.kapoor@email.com", amount: 18999, status: "FAILED", reason: "card_declined", attempts: 4, purchases: 0, activity: "Low", age: "1 hr ago", intent: 31, probability: 18, confidence: 93, risk: "HIGH", action: "HUMAN_REVIEW", reasonText: "High amount, no purchase history, and repeated failures require human review before contact.", paymentLink: null, recovered: false },
  { id: "pay_priya_mehta", name: "Priya Mehta", initials: "PM", email: "priya.mehta@email.com", amount: 32000, status: "FAILED", reason: "card_declined", attempts: 1, purchases: 2, activity: "Medium", age: "4 min ago", intent: 74, probability: 64, confidence: 68, risk: "MEDIUM", action: "HUMAN_REVIEW", reasonText: "The value and confidence threshold require merchant approval before recovery.", paymentLink: null, recovered: false }
];

const formatMoney = (value) => `₹${value.toLocaleString("en-IN")}`;
const actionLabel = { PAYMENT_LINK: "Payment link", RETRY_LATER: "Retry later", REMINDER: "Send reminder", HUMAN_REVIEW: "Human review" };
const api = async (path, options = {}) => {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "API request failed");
  return payload;
};

function App() {
  const [cases, setCases] = useState(initialCases);
  const [selectedId, setSelectedId] = useState("pay_rahul");
  const [view, setView] = useState("queue");
  const [stage, setStage] = useState("idle");
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [audit, setAudit] = useState([
    { time: "10:31:02", text: "Payment failure detected", detail: "pay_rahul · ₹8,499" },
    { time: "10:31:03", text: "Recovery case created", detail: "Risk score calculated" }
  ]);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState("");
  const [approvals, setApprovals] = useState([{ id: "pay_priya_mehta", name: "Priya Mehta", amount: 32000, confidence: 68, reason: "The value and confidence threshold require merchant approval before recovery." }]);
  const [apiFailure, setApiFailure] = useState(false);
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const recovered = cases.filter((item) => item.recovered).reduce((sum, item) => sum + item.amount, 0);
  const activeCases = cases.filter((item) => item.status === "FAILED").length;
  const atRisk = cases.filter((item) => item.status === "FAILED").reduce((sum, item) => sum + item.amount, 0);
  const recoveryRate = recovered ? Math.round((recovered / (recovered + atRisk)) * 100) : 0;
  const visibleCases = cases.filter((item) => {
    const matchesQuery = `${item.name} ${item.email} ${item.reason}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "ALL" || (filter === "HIGH" && item.risk === "HIGH") || (filter === "CAPTURED" && item.status === "CAPTURED");
    return matchesQuery && matchesFilter;
  });
  useEffect(() => {
    Promise.all([api("/api/cases"), api("/api/audit")])
      .then(([casePayload, auditPayload]) => {
        setCases(casePayload.cases);
        setAudit(auditPayload.audit);
        setApiReady(true);
      })
      .catch((error) => setApiError(error.message));
  }, []);

  const notify = (message, kind = "success") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3200);
  };
  const addAudit = (text, detail) => setAudit((items) => [{ time: new Date().toLocaleTimeString("en-IN", { hour12: false }), text, detail }, ...items]);
  const perform = async (path, options = {}) => {
    try {
      const payload = await api(path, options);
      if (payload.item) setCases((items) => items.map((item) => item.id === payload.item.id ? payload.item : item));
      if (payload.stage) setStage(payload.stage);
      const auditPayload = await api("/api/audit");
      setAudit(auditPayload.audit);
      return payload;
    } catch (error) {
      notify(error.message, "warning");
      return null;
    }
  };
  const selectCase = (id) => { setSelectedId(id); setStage("idle"); setView("detail"); };
  const runAnalysis = async () => { if (!apiReady) return notify("Start the API server first", "warning"); const payload = await perform(`/api/cases/${selected.id}/analysis`, { method: "POST" }); if (payload) notify("AI decision ready"); };
  const runPolicy = async () => {
    if (stage === "idle") return notify("Run AI Analysis first", "warning");
    if (!apiReady) return notify("Start the API server first", "warning");
    const payload = await perform(`/api/cases/${selected.id}/policy`, { method: "POST" });
    if (payload) notify(payload.stage === "blocked" ? "Recovery blocked — payment already captured" : "AUTO APPROVED", payload.stage === "blocked" ? "warning" : "success");
  };
  const execute = async () => {
    if (stage !== "approved") return notify("Policy approval is required before execution", "warning");
    const payload = await perform(`/api/cases/${selected.id}/execute`, { method: "POST" });
    if (payload) notify("Payment link created");
  };
  const simulatePayment = async () => {
    const payload = await perform(`/api/cases/${selected.id}/capture`, { method: "POST" });
    if (payload) notify(`${formatMoney(selected.amount)} recovered`);
  };
  const resetDemo = () => {
    if (!apiReady) return notify("Start the API server first", "warning");
    api("/api/reset", { method: "POST" }).then((payload) => {
      setCases(payload.cases);
      setAudit(payload.audit);
    }).catch((error) => notify(error.message, "warning"));
    setSelectedId("pay_rahul");
    setStage("idle");
    setView("queue");
    setQuery("");
    setFilter("ALL");
    setAudit([{ time: "10:31:02", text: "Payment failure detected", detail: "pay_rahul · ₹8,499" }, { time: "10:31:03", text: "Recovery case created", detail: "Risk score calculated" }]);
    notify("Demo reset to starting state");
  };
  const refreshData = async () => {
    try {
      const [casePayload, auditPayload] = await Promise.all([api("/api/cases"), api("/api/audit")]);
      setCases(casePayload.cases);
      setAudit(auditPayload.audit);
      notify("Workspace synced — all payment states are current");
    } catch (error) {
      setApiError(error.message);
      notify(error.message, "warning");
    }
  };
  const runCommand = (value) => {
    const command = value.toLowerCase();
    if (command.includes("biggest") || command.includes("risk")) { setFilter("HIGH"); setView("queue"); notify("Showing highest-risk recovery cases"); return; }
    if (command.includes("blocked") || command.includes("ananya")) { setView(command.includes("ananya") ? "detail" : "guard"); if (command.includes("ananya")) selectCase("pay_ananya"); notify("Showing Recovery Guard decision"); return; }
    if (command.includes("recover")) { setView("dashboard"); notify(`Recovered revenue: ${formatMoney(recovered)}`); return; }
    if (command.includes("approval")) { setView("approvals"); notify("Showing cases waiting for approval"); return; }
    if (command.includes("rahul")) { selectCase("pay_rahul"); return; }
    notify("Try: biggest revenue risks, blocked recovery actions, or cases waiting for approval", "warning");
  };
  const toggleFailure = async () => {
    const enabled = !apiFailure;
    try { await api("/api/demo/failure", { method: "POST", body: JSON.stringify({ enabled }) }); setApiFailure(enabled); notify(enabled ? "Razorpay API failure simulation enabled" : "Razorpay API restored"); } catch (error) { notify(error.message, "warning"); }
  };
  const approveCase = async () => {
    const payload = await perform(`/api/approvals/${selected.id}/approve`, { method: "POST" });
    if (payload) notify("Human approval granted");
  };

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={19} /></div><div><strong>REVIVE</strong><span>AI REVENUE RECOVERY</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><b>Acme Commerce</b><small>Live workspace</small></div><ChevronRight size={15} /></div>
      <nav>
        <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><LayoutDashboard size={17} /> Overview</button>
        <button className={view === "queue" || view === "detail" ? "active" : ""} onClick={() => setView("queue")}><CircleAlert size={17} /> Recovery queue <em>{activeCases}</em></button>
        <button className={view === "audit" ? "active" : ""} onClick={() => setView("audit")}><Clock3 size={17} /> Audit trail</button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")}><Activity size={17} /> Analytics</button>
        <button className={view === "guard" ? "active" : ""} onClick={() => setView("guard")}><ShieldCheck size={17} /> Recovery Guard</button>
        <button className={view === "approvals" ? "active" : ""} onClick={() => setView("approvals")}><UserCheck size={17} /> Approvals <em>{approvals.length}</em></button>
        <button className={view === "transactions" ? "active" : ""} onClick={() => setView("transactions")}><Table2 size={17} /> Transactions</button>
      </nav>
      <div className="sidebar-bottom"><div className="guard-badge"><ShieldCheck size={17} /><div><b>Recovery Guard</b><small>Always on</small></div><span /></div><div className="user"><div className="user-avatar">AK</div><div><b>Aditya Kumar</b><small>Administrator</small></div></div></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">MONDAY, 05 SEPTEMBER 2026</p><h1>{view === "dashboard" ? "Revenue command center" : view === "audit" ? "Audit trail" : view === "analytics" ? "Recovery intelligence" : view === "guard" ? "Recovery Guard" : view === "approvals" ? "Human approvals" : view === "transactions" ? "Transactions" : "Recovery queue"}</h1><p className="subtitle">{view === "dashboard" ? "A clear view of revenue recovered and protected." : view === "analytics" ? "Understand where your recovery engine is creating the most impact." : view === "guard" ? "Every recovery action is verified before execution." : view === "approvals" ? "AI decisions requiring merchant review." : view === "transactions" ? "Search and inspect every payment event." : "Turn failed payments into recovered revenue, safely."}</p></div><div className="header-actions"><span className="live"><i /> LIVE MODE</span><button className="icon-button" onClick={() => notify("3 notifications: 1 approval, 1 recovery, 1 guard event")} title="Notifications"><Bell size={17} /></button><button className="icon-button" onClick={refreshData} title="Sync workspace"><RefreshCw size={17} /></button></div></header>
      <div className="command-bar"><Command size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value) setView("queue"); }} onKeyDown={(event) => { if (event.key === "Enter") runCommand(event.currentTarget.value); }} placeholder="Ask Revive anything or search cases..." /><kbd>⌘ K</kbd><button onClick={() => notify("Press Enter to run a command", "warning")}><Zap size={14} /> Command help</button></div>
      {apiError && <div className="api-warning"><CircleAlert size={14} /> API offline — showing local demo state. Run <code>npm run server</code> to enable shared state.</div>}
      {view === "dashboard" ? <Dashboard atRisk={atRisk} recovered={recovered} recoveryRate={recoveryRate} activeCases={activeCases} cases={cases} onSelect={selectCase} /> : view === "audit" ? <Audit audit={audit} /> : view === "analytics" ? <Analytics cases={cases} recovered={recovered} /> : view === "guard" ? <Guard cases={cases} onAudit={() => setView("audit")} /> : view === "approvals" ? <Approvals approvals={approvals} setApprovals={setApprovals} notify={notify} /> : view === "transactions" ? <Transactions cases={cases} query={query} onSelect={selectCase} /> : <div className="content-grid">
        <section className="queue-panel"><div className="section-heading"><div><h2>Priority opportunities</h2><p>{visibleCases.length} cases need attention</p></div><div className="queue-controls"><button className={`filter ${filter === "ALL" ? "chosen" : ""}`} onClick={() => setFilter("ALL")}><span /> All</button><button className={`filter ${filter === "HIGH" ? "chosen" : ""}`} onClick={() => setFilter("HIGH")}><Filter size={12} /> High risk</button><button className={`filter ${filter === "CAPTURED" ? "chosen" : ""}`} onClick={() => setFilter("CAPTURED")}><Check size={12} /> Captured</button></div></div><div className="queue-list">{visibleCases.length ? visibleCases.map((item) => <button className={`case-row ${selected.id === item.id ? "selected" : ""}`} key={item.id} onClick={() => selectCase(item.id)}><div className={`case-avatar ${item.status === "CAPTURED" ? "captured" : ""}`}>{item.initials}</div><div className="case-main"><div><b>{item.name}</b><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></div><small>{item.reason.replaceAll("_", " ")} · {item.age}</small></div><div className="case-amount"><b>{formatMoney(item.amount)}</b><small>{item.action.replaceAll("_", " ")}</small></div><ChevronRight size={16} className="row-chevron" /></button>) : <div className="empty-state"><Search size={22} /><b>No cases match this view</b><small>Try another search or filter.</small></div>}</div></section>
        <section className="detail-panel"><CaseDetail selected={selected} stage={stage} onAnalyze={runAnalysis} onPolicy={runPolicy} onApprove={approveCase} onExecute={execute} onSimulate={simulatePayment} /></section>
      </div>}
      <footer><span><LockKeyhole size={13} /> AI recommends. Policy decides. Razorpay executes.</span><span>No financial action is executed directly by the AI model.</span><button onClick={toggleFailure}>{apiFailure ? "Disable API failure" : "Simulate API failure"}</button><button onClick={resetDemo}>Reset demo</button></footer>
    </main>
    {toast && <div className={`toast ${toast.kind}`}><Check size={16} /> {toast.message}</div>}
  </div>;
}

function Dashboard({ atRisk, recovered, recoveryRate, activeCases, cases, onSelect }) {
  return <div className="dashboard"><div className="metrics"><Metric title="Revenue at risk" value={formatMoney(atRisk)} change="12.4% vs last week" icon={<IndianRupee />} tone="orange" /><Metric title="Recovered revenue" value={formatMoney(recovered || 86400)} change={recovered ? "Updated just now" : "18.7% vs last week"} icon={<ArrowUpRight />} tone="green" /><Metric title="Recovery rate" value={`${recoveryRate || 38}%`} change="Target: 35%" icon={<Activity />} tone="blue" /><Metric title="Active cases" value={activeCases} change="3 high priority" icon={<CircleAlert />} tone="purple" /></div><div className="orbit-impact"><div className="orbit"><div className="orbit-core"><Sparkles size={18} /><b>REVIVE</b><small>AI ENGINE</small></div><i className="orbit-ring ring-one" /><i className="orbit-ring ring-two" /><span className="orbit-node node-one">₹8.5K <small>Rahul</small></span><span className="orbit-node node-two">₹13K <small>Guarded</small></span><span className="orbit-node node-three">₹3.5K <small>Retry later</small></span></div><div className="orbit-copy"><p className="eyebrow">REVENUE RECOVERY ORBIT</p><h2>Money in motion, decisions in control.</h2><p className="muted">Revive continuously maps risk, intent, and safe interventions across your payment surface.</p><div className="orbit-legend"><span><i className="dot risk" /> Revenue at risk</span><span><i className="dot safe" /> Protected by guard</span><span><i className="dot action" /> Action ready</span></div></div></div><div className="impact-card"><div><p className="eyebrow">BUSINESS IMPACT</p><h2>Revenue protected today</h2><p className="muted">Every decision is measurable and auditable.</p></div><div className="impact-stats"><div><span>Recovered</span><b>₹86,400</b></div><div><span>Duplicate recovery prevented</span><b>₹12,999</b></div><div><span>Potential revenue actioned</span><b>₹1,14,500</b></div></div></div><div className="dashboard-bottom"><div className="chart-card"><div className="section-heading"><div><h2>Recovery performance</h2><p>Recovered vs revenue at risk · last 7 days</p></div><span className="chart-total">₹1.2L <small>protected</small></span></div><div className="chart"><div className="grid-lines"><i /><i /><i /><i /></div><svg viewBox="0 0 700 180" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#41d39a" stopOpacity=".35" /><stop offset="1" stopColor="#41d39a" stopOpacity="0" /></linearGradient></defs><path d="M0 150 C65 130 88 136 125 120 S190 132 230 95 S290 110 335 75 S400 100 440 58 S500 70 540 45 S620 55 700 18 L700 180 L0 180Z" fill="url(#fill)" /><path d="M0 150 C65 130 88 136 125 120 S190 132 230 95 S290 110 335 75 S400 100 440 58 S500 70 540 45 S620 55 700 18" fill="none" stroke="#41d39a" strokeWidth="3" /></svg><div className="chart-labels"><span>30 Aug</span><span>31 Aug</span><span>01 Sep</span><span>02 Sep</span><span>03 Sep</span><span>04 Sep</span><span>05 Sep</span></div></div></div><div className="quick-card"><div className="section-heading"><div><h2>Top opportunities</h2><p>Highest probability to recover</p></div><button onClick={() => onSelect(cases[0].id)}>View queue <ArrowUpRight size={14} /></button></div>{cases.slice(0, 3).map((item) => <button className="opportunity" key={item.id} onClick={() => onSelect(item.id)}><div className="case-avatar">{item.initials}</div><div><b>{item.name}</b><small>{item.probability}% recovery probability</small></div><strong>{formatMoney(item.amount)}</strong></button>)}</div></div></div>;
}
function Metric({ title, value, change, icon, tone }) { return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{change}</small></div></div>; }
function Analytics({ cases, recovered }) {
  const highIntent = cases.filter((item) => item.intent >= 80).length;
  const guarded = cases.filter((item) => item.latestStatus === "CAPTURED").length;
  return <div className="analytics-page"><div className="analytics-hero"><div><p className="eyebrow">AGENT PERFORMANCE</p><h2>The engine is learning what converts.</h2><p className="subtitle">A decision layer built around outcomes, not activity.</p></div><div className="agent-score"><span>AGENT HEALTH</span><b>94</b><small>Excellent</small></div></div><div className="analytics-grid"><div className="analytics-card"><span>High-intent opportunities</span><b>{highIntent}</b><small>of {cases.length} active signals</small><div className="progress"><i style={{ width: `${(highIntent / cases.length) * 100}%` }} /></div></div><div className="analytics-card"><span>Duplicate collections avoided</span><b>₹12,999</b><small>{guarded} case protected by Recovery Guard</small><div className="progress purple"><i style={{ width: "76%" }} /></div></div><div className="analytics-card"><span>Recovered this session</span><b>{formatMoney(recovered || 86400)}</b><small>Across approved interventions</small><div className="progress blue"><i style={{ width: "61%" }} /></div></div></div><div className="insight-card"><Sparkles size={18} /><div><b>Agent insight</b><p>Payment links outperform immediate retries for repeat customers with two or more failed attempts. The policy engine is prioritizing safer alternate rails.</p></div><span>LIVE</span></div></div>;
}
function Guard({ cases, onAudit }) {
  const blocked = cases.find((item) => item.latestStatus === "CAPTURED");
  return <div className="guard-page"><div className="guard-metrics"><Metric title="Protected revenue" value="₹12,999" change="Today" icon={<ShieldCheck />} tone="green" /><Metric title="Actions blocked" value="3" change="Duplicate-safe" icon={<CircleAlert />} tone="orange" /><Metric title="Unsafe actions prevented" value="100%" change="Policy enforced" icon={<LockKeyhole />} tone="blue" /></div><div className="guard-pipeline">{["EVENT", "AI", "POLICY", "GUARD", "ACTION"].map((step, index) => <React.Fragment key={step}><div className={`pipeline-step ${index === 3 ? "blocked" : "passed"}`}><span>{index === 3 ? "!" : "✓"}</span><b>{step}</b><small>{index === 3 ? "STATE CHECK" : "VERIFIED"}</small></div>{index < 4 && <ChevronRight className="pipeline-arrow" />}</React.Fragment>)}</div><div className="blocked-case"><div className="blocked-case-head"><div><p className="eyebrow">BLOCKED CASE · PAYMENT STATE CHANGED</p><h2>{blocked?.name || "Ananya Sharma"} <span>{formatMoney(blocked?.amount || 12999)}</span></h2><p className="muted">Initial event: <b>payment.failed</b> · AI recommendation: <b>Payment Link</b></p></div><span className="guard-status">GUARD ACTIVE</span></div><div className="state-check"><div><small>INITIAL EVENT</small><b>payment.failed</b><span>10:31:02</span></div><ChevronRight /><div className="checking"><ShieldCheck size={18} /><small>VERIFYING LATEST PAYMENT STATE</small><b>Recovery Guard check</b></div><ChevronRight /><div className="captured-state"><small>LATEST STATE</small><b>payment.captured</b><span>10:31:08</span></div></div><div className="blocked-message"><ShieldCheck size={22} /><div><b>RECOVERY BLOCKED</b><p>Payment already captured. No recovery action was executed.</p><small>Potential duplicate recovery prevented: {formatMoney(blocked?.amount || 12999)}</small></div><button className="secondary" onClick={onAudit}>View audit trail <ArrowUpRight size={14} /></button></div></div></div>;
}
function Approvals({ approvals, setApprovals, notify }) {
  const decide = (id, decision) => {
    setApprovals((items) => items.filter((item) => item.id !== id));
    notify(`${decision} recorded and added to audit trail`);
  };
  return <div className="approvals-page"><div className="approval-summary"><div><p className="eyebrow">MERCHANT CONTROL</p><h2>Nothing moves without your approval.</h2><p className="subtitle">Revive routes high-risk or high-value decisions to a human before execution.</p></div><div className="approval-count"><b>{approvals.length}</b><span>AWAITING REVIEW</span></div></div>{approvals.length ? approvals.map((item) => <div className="approval-card" key={item.id}><div className="approval-avatar">AK</div><div className="approval-copy"><div><h3>{item.name}</h3><span className="status failed">HUMAN REVIEW</span></div><p>{item.reason}</p><small>High-value recovery · detected 4 min ago</small></div><div className="approval-confidence"><span>AI CONFIDENCE</span><b>{item.confidence}%</b></div><div className="approval-amount"><span>AMOUNT</span><b>{formatMoney(item.amount)}</b></div><div className="approval-actions"><button className="secondary" onClick={() => decide(item.id, "Rejected")}>Reject</button><button className="primary" onClick={() => decide(item.id, "Approved")}>Approve <Check size={14} /></button></div></div>) : <div className="empty-state approval-empty"><Check size={25} /><b>All decisions reviewed</b><small>No human approvals are waiting.</small></div>}</div>;
}
function Transactions({ cases, query, onSelect }) {
  const rows = cases.filter((item) => `${item.name} ${item.id} ${item.reason}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="transactions-page"><div className="table-toolbar"><div><h2>Payment events</h2><p>{rows.length} transactions in this workspace</p></div><span className="table-note"><ShieldCheck size={14} /> Recovery Guard monitors every event</span></div><div className="transactions-table"><div className="table-head"><span>TRANSACTION</span><span>CUSTOMER</span><span>AMOUNT</span><span>STATUS</span><span>RECOVERY SIGNAL</span><span /></div>{rows.map((item) => <button className="transaction-row" key={item.id} onClick={() => onSelect(item.id)}><span className="transaction-id"><b>{item.id}</b><small>{item.reason.replaceAll("_", " ")}</small></span><span className="customer-cell"><div className="case-avatar">{item.initials}</div><b>{item.name}</b></span><b>{formatMoney(item.amount)}</b><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span><span className="signal">{item.probability}% probability</span><ChevronRight size={15} /></button>)}</div></div>;
}
function CaseDetail({ selected, stage, onAnalyze, onPolicy, onApprove, onExecute, onSimulate }) {
  const blocked = stage === "blocked";
  const recovered = stage === "recovered" || selected.status === "CAPTURED";
  return <>{<div className="detail-top"><div><p className="eyebrow">RECOVERY CASE · {selected.id}</p><h2>{selected.name}</h2><p className="muted"><UserRound size={14} /> {selected.email}</p></div><div className="detail-amount"><span>Revenue at risk</span><b>{formatMoney(selected.amount)}</b><small>{selected.status === "CAPTURED" ? "Captured" : selected.reason.replaceAll("_", " ")}</small></div></div>}
    {blocked && <div className="blocked-banner"><div className="banner-icon"><ShieldCheck size={20} /></div><div><b>RECOVERY BLOCKED</b><p>Payment is already successful. No recovery action was executed.</p><small>Potential duplicate collection prevented · {formatMoney(selected.amount)}</small></div></div>}
    {recovered && !blocked && <div className="recovered-banner"><div className="banner-icon"><Check size={20} /></div><div><b>{formatMoney(selected.amount)} RECOVERED</b><p>Payment captured successfully via Revive AI.</p></div></div>}
    <div className="ai-card"><div className="ai-card-head"><div className="ai-title"><div className="sparkle"><Sparkles size={17} /></div><div><h3>AI recovery decision</h3><p>Analyzed moments ago · deterministic output</p></div></div>{stage !== "idle" && <span className="complete"><Check size={13} /> ANALYSIS COMPLETE</span>}</div><div className="decision-grid"><Decision label="Customer intent" value={`${selected.intent}%`} caption={selected.intent > 80 ? "HIGH" : "MEDIUM"} /><Decision label="Recovery probability" value={`${selected.probability}%`} caption="Estimated" /><Decision label="AI confidence" value={`${selected.confidence}%`} caption="High confidence" /><Decision label="Risk level" value={selected.risk} caption={selected.risk === "LOW" ? "Within guardrails" : "Review needed"} /></div><div className="recommendation"><div className="recommendation-label">RECOMMENDED ACTION</div><div className="recommendation-main"><Link2 size={18} /><b>{actionLabel[selected.action]}</b><span>{selected.reasonText}</span></div></div><div className="customer-facts"><div><span>Previous attempts</span><b>{selected.attempts}</b></div><div><span>Successful purchases</span><b>{selected.purchases}</b></div><div><span>Customer activity</span><b>{selected.activity}</b></div></div></div>
    <div className="actions"><button className="secondary" onClick={onAnalyze} disabled={recovered || blocked}><Sparkles size={16} /> Run AI analysis</button><button className="secondary" onClick={onPolicy} disabled={recovered || blocked}><ShieldCheck size={16} /> Run policy check</button>{stage === "approval_required" ? <button className="primary" onClick={onApprove}><UserCheck size={16} /> Approve recovery</button> : <button className="primary" onClick={onExecute} disabled={recovered || blocked || stage !== "approved"}><CreditCard size={16} /> Execute recovery <ArrowUpRight size={15} /></button>}</div>
    {stage === "executed" && <div className="simulate"><div><b>Payment link ready</b><small>{selected.paymentLink || "https://rzp.io/i/revive-demo"}</small></div><button className="primary" onClick={onSimulate}><Check size={16} /> Simulate customer payment</button></div>}
    <div className="guard-note"><ShieldCheck size={16} /><div><b>Recovery Guard is active</b><p>Latest payment status is verified immediately before every financial action.</p></div></div>
  </>;
}
function Decision({ label, value, caption }) { return <div className="decision"><span>{label}</span><b>{value}</b><small>{caption}</small></div>; }
function Audit({ audit }) { return <div className="audit-page"><div className="audit-intro"><div><p className="eyebrow">SYSTEM ACTIVITY</p><h2>Every decision, accounted for.</h2><p className="subtitle">An immutable-looking timeline of detection, analysis, policy, and execution.</p></div><span className="audit-count">{audit.length} EVENTS</span></div><div className="audit-list">{audit.map((item, index) => <div className="audit-item" key={`${item.time}-${index}`}><div className="audit-dot" /><time>{item.time}</time><div><b>{item.text}</b><p>{item.detail}</p></div><span>{index === 0 ? "LATEST" : "LOGGED"}</span></div>)}</div></div>; }

createRoot(document.getElementById("root")).render(<App />);
