import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const cases = [
  { id: "pay_rahul", name: "Rahul Mehta", initials: "RM", email: "rahul.mehta@email.com", amount: 8499, status: "FAILED", reason: "insufficient_funds", attempts: 2, purchases: 4, activity: "High", age: "12 min ago", intent: 91, probability: 82, confidence: 89, risk: "LOW", action: "PAYMENT_LINK", reasonText: "Strong purchase history and repeated intent. A payment link gives the customer a safer path than another immediate retry.", paymentLink: null, recovered: false },
  { id: "pay_ananya", name: "Ananya Sharma", initials: "AS", email: "ananya.sharma@email.com", amount: 12999, status: "FAILED", reason: "network_error", attempts: 1, purchases: 7, activity: "High", age: "18 min ago", intent: 87, probability: 79, confidence: 92, risk: "LOW", action: "PAYMENT_LINK", reasonText: "A high-value repeat customer is likely to complete checkout when given a fresh payment route.", paymentLink: null, recovered: false, latestStatus: "CAPTURED" },
  { id: "pay_vikram", name: "Vikram Singh", initials: "VS", email: "vikram.singh@email.com", amount: 3499, status: "FAILED", reason: "card_declined", attempts: 3, purchases: 1, activity: "Medium", age: "34 min ago", intent: 58, probability: 44, confidence: 84, risk: "MEDIUM", action: "RETRY_LATER", reasonText: "Repeated failures increase friction. Wait before trying again to avoid unnecessary declines.", paymentLink: null, recovered: false },
  { id: "pay-priya", name: "Priya Nair", initials: "PN", email: "priya.nair@email.com", amount: 2199, status: "FAILED", reason: "timeout", attempts: 1, purchases: 2, activity: "Medium", age: "51 min ago", intent: 72, probability: 65, confidence: 81, risk: "LOW", action: "REMINDER", reasonText: "The checkout timed out with positive intent. A lightweight reminder is the safest next step.", paymentLink: null, recovered: false },
  { id: "pay-arjun", name: "Arjun Kapoor", initials: "AK", email: "arjun.kapoor@email.com", amount: 18999, status: "FAILED", reason: "card_declined", attempts: 4, purchases: 0, activity: "Low", age: "1 hr ago", intent: 31, probability: 18, confidence: 93, risk: "HIGH", action: "HUMAN_REVIEW", reasonText: "High amount, no purchase history, and repeated failures require human review before contact.", paymentLink: null, recovered: false },
  { id: "pay_priya_mehta", name: "Priya Mehta", initials: "PM", email: "priya.mehta@email.com", amount: 32000, status: "FAILED", reason: "card_declined", attempts: 1, purchases: 2, activity: "Medium", age: "4 min ago", intent: 74, probability: 64, confidence: 68, risk: "MEDIUM", action: "HUMAN_REVIEW", reasonText: "The value and confidence threshold require merchant approval before recovery.", paymentLink: null, recovered: false }
];

const initialAudit = [
  { time: "10:31:02", text: "Payment failure detected", detail: "pay_rahul · ₹8,499" },
  { time: "10:31:03", text: "Recovery case created", detail: "Risk score calculated" }
];
let audit = [...initialAudit];
let apiFailure = false;
const processedEvents = new Set();
const dataPath = path.join(process.cwd(), "server", "demo-state.json");
const saveState = () => fs.writeFileSync(dataPath, JSON.stringify({ cases, audit }, null, 2));
const loadState = () => {
  if (!fs.existsSync(dataPath)) return;
  const saved = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  if (Array.isArray(saved.cases)) cases.splice(0, cases.length, ...saved.cases);
  if (Array.isArray(saved.audit)) audit = saved.audit;
};
const send = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  response.end(JSON.stringify(body));
};
const parseBody = async (request) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};
const findCase = (id) => cases.find((item) => item.id === id);
const log = (text, detail) => { audit.unshift({ time: new Date().toLocaleTimeString("en-IN", { hour12: false }), text, detail }); saveState(); };
const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(request.url, "http://localhost");
  try {
    if (request.method === "GET" && url.pathname === "/api/cases") return send(response, 200, { cases });
    if (request.method === "GET" && url.pathname === "/api/audit") return send(response, 200, { audit });
    if (request.method === "POST" && url.pathname === "/api/reset") {
      cases.splice(0, cases.length, ...structuredClone(initialCases));
      audit = [...initialAudit];
      apiFailure = false;
      saveState();
      return send(response, 200, { cases, audit });
    }
    if (request.method === "POST" && url.pathname === "/api/demo/failure") {
      const body = await parseBody(request);
      apiFailure = Boolean(body.enabled);
      return send(response, 200, { enabled: apiFailure });
    }
    if (request.method === "POST" && url.pathname === "/api/webhooks") {
      const body = await parseBody(request);
      const eventId = body.event_id || `${body.event || "event"}:${body.payment_id || "unknown"}`;
      if (processedEvents.has(eventId)) {
        log("Duplicate event ignored", eventId);
        return send(response, 200, { duplicate: true });
      }
      processedEvents.add(eventId);
      const item = findCase(body.payment_id);
      if (item && body.event === "payment.captured") {
        item.status = "CAPTURED";
        item.recovered = true;
      }
      log(`Webhook processed: ${body.event || "payment event"}`, body.payment_id || "demo event");
      return send(response, 200, { duplicate: false, item });
    }
    const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
    if (request.method === "POST" && approvalMatch) {
      const item = findCase(approvalMatch[1]);
      if (!item) return send(response, 404, { error: "Approval case not found" });
      if (approvalMatch[2] === "reject") {
        item.status = "REJECTED";
        log("Human approval rejected", `${item.name} · ₹${item.amount.toLocaleString("en-IN")}`);
        return send(response, 200, { item, stage: "rejected" });
      }
      item.policyStatus = "APPROVED";
      log("Human approval granted", `${item.name} · ₹${item.amount.toLocaleString("en-IN")}`);
      return send(response, 200, { item, stage: "approved" });
    }
    const match = url.pathname.match(/^\/api\/cases\/([^/]+)\/(analysis|policy|execute|capture)$/);
    if (request.method === "POST" && match) {
      const item = findCase(match[1]);
      if (!item) return send(response, 404, { error: "Recovery case not found" });
      const action = match[2];
      if (action === "analysis") {
        log("AI analysis completed", `${item.name} · ${item.action}`);
        return send(response, 200, { stage: "analyzed", item });
      }
      if (action === "policy") {
        if (item.latestStatus === "CAPTURED" || item.status === "CAPTURED") {
          log("Recovery blocked by Recovery Guard", "Payment already captured");
          return send(response, 200, { stage: "blocked", reason: "Payment already captured", item });
        }
        if (item.risk === "HIGH" || item.confidence < 70 || item.probability < 60 || item.amount > 50000 || item.id === "pay_priya_mehta") {
          item.policyStatus = "HUMAN_REVIEW";
          log("Human approval required", `${item.name} · confidence ${item.confidence}%`);
          return send(response, 200, { stage: "approval_required", item });
        }
        item.policyStatus = "APPROVED";
        log("Policy check approved", "Within bounded limits");
        return send(response, 200, { stage: "approved", item });
      }
      if (action === "execute") {
        if (apiFailure) {
          log("Recovery action failed safely", "Razorpay mock adapter unavailable; no retry performed");
          return send(response, 503, { error: "RECOVERY_ACTION_FAILED_SAFELY" });
        }
        if (item.policyStatus !== "APPROVED") return send(response, 409, { error: "Human approval is required before execution" });
        item.paymentLink = `https://rzp.io/i/revive-${item.id.slice(-4)}`;
        log("Payment link created", `${item.name} · ₹${item.amount.toLocaleString("en-IN")}`);
        return send(response, 200, { stage: "executed", item });
      }
      item.status = "CAPTURED";
      item.recovered = true;
      log("Payment captured", `${item.name} · ₹${item.amount.toLocaleString("en-IN")} recovered`);
      return send(response, 200, { stage: "recovered", item });
    }
    return send(response, 404, { error: "Route not found" });
  } catch (error) {
    return send(response, 400, { error: error instanceof Error ? error.message : "Request failed" });
  }
});

server.listen(3001, () => console.log("Revive API listening on http://localhost:3001"));

const initialCases = structuredClone(cases);
loadState();
