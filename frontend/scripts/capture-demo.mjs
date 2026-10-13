import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

// Capture a real browser walkthrough against the public demo. Run with VF_DEMO_PASSWORD
// set; a uniquely named supplier is deleted again when the capture finishes.
const site = process.env.VF_DEMO_SITE ?? "https://vendorflow-web.onrender.com";
const api = process.env.VF_DEMO_API ?? "https://vendorflow-api-rlbq.onrender.com/api";
const password = process.env.VF_DEMO_PASSWORD;
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
if (!password) throw new Error("VF_DEMO_PASSWORD is required");
if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`);

const profile = mkdtempSync(join(tmpdir(), "vendorflow-walkthrough-"));
const chrome = spawn(chromePath, [
  "--headless=new", "--no-first-run", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const pending = new Map();
const captures = new Map();
let socket;
let nextId = 1;
let token;
let organizationId;
let taxId;

function command(method, params = {}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const id = nextId++;
    pending.set(id, { resolveCommand, rejectCommand });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function until(check, label, attempts = 320) {
  for (let index = 0; index < attempts; index++) {
    try {
      if (await check()) return;
    } catch { /* A navigation can replace the JavaScript execution context. */ }
    await sleep(250);
  }
  const state = socket
    ? await evaluate(`({path:location.pathname,heading:document.querySelector("h1")?.textContent,alert:document.querySelector('[role="alert"]')?.textContent})`).catch(() => null)
    : null;
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(state)}`);
}

async function navigate(path) {
  await command("Page.navigate", { url: site + path });
  await until(() => evaluate(`location.pathname === ${JSON.stringify(path)}`), path);
}

async function click(expression) {
  const rect = await evaluate(`(() => {
    const element = ${expression};
    if (!element) return null;
    element.scrollIntoView({ block: "center" });
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  })()`);
  if (!rect) throw new Error(`Element not found: ${expression}`);
  await command("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await command("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
}

async function fill(selector, value) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await command("Input.insertText", { text: value });
}

async function capture(name) {
  await sleep(300);
  const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  captures.set(name, Buffer.from(result.data, "base64"));
  console.log(`Captured ${name}`);
}

async function removeTemporarySupplier() {
  const response = await fetch(`${api}/organizations/${organizationId}/suppliers/?search=${encodeURIComponent(taxId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await response.json();
  for (const supplier of list.results ?? []) {
    if (supplier.tax_id !== taxId) continue;
    const deletion = await fetch(`${api}/organizations/${organizationId}/suppliers/${supplier.id}/`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (!deletion.ok) throw new Error(`DELETE returned ${deletion.status}`);
    console.log("Removed temporary demo supplier");
  }
}

function removeTemporaryProfile() {
  const tempRoot = realpathSync(tmpdir()).toLowerCase() + sep;
  const resolvedProfile = realpathSync(profile).toLowerCase();
  if (!resolvedProfile.startsWith(tempRoot)) throw new Error("Refusing to remove browser profile outside temp");
  rmSync(profile, { recursive: true, force: true });
}

try {
  const portFile = join(profile, "DevToolsActivePort");
  await until(() => existsSync(portFile), "Chrome debugger");
  const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("No Chrome page target");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => { socket.onopen = resolveOpen; socket.onerror = rejectOpen; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.rejectCommand(new Error(message.error.message));
    else request.resolveCommand(message.result);
  };
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  await navigate("/login");
  await until(() => evaluate(`document.querySelector("h1")?.textContent === "Welcome back"`), "login");
  await capture("login.png");
  await until(() => evaluate(`Object.keys(document.querySelector('button[type="submit"]') ?? {}).some((key) => key.startsWith("__reactProps$"))`), "login hydration");
  await fill("#email", "alex@vendorflow.demo");
  await fill("#password", password);
  await click(`document.querySelector('button[type="submit"]')`);
  await until(() => evaluate(`location.pathname === "/" && document.querySelector("h1")?.textContent === "Dashboard"`), "dashboard");
  await until(() => evaluate(`document.body.innerText.includes("Total suppliers") && !document.body.innerText.includes("Loading dashboard")`), "dashboard data");
  await capture("dashboard.png");

  token = await evaluate(`localStorage.getItem("vendorflow.access")`);
  const organizations = await (await fetch(`${api}/organizations/`, { headers: { Authorization: `Bearer ${token}` } })).json();
  organizationId = organizations.find((organization) => organization.slug === "vendorflow-demo")?.id;
  if (!organizationId) throw new Error("Demo organization missing");

  await navigate("/suppliers");
  await until(() => evaluate(`document.querySelector("h1")?.textContent === "Suppliers" && !!document.querySelector("table tbody tr")`), "supplier list");
  await capture("suppliers-list.png");
  await click(`document.querySelector('[data-slot="select-trigger"]')`);
  await until(() => evaluate(`[...document.querySelectorAll('[data-slot="select-item"]')].some((item) => item.textContent.trim() === "Pending")`), "status options");
  await click(`[...document.querySelectorAll('[data-slot="select-item"]')].find((item) => item.textContent.trim() === "Pending")`);
  await until(() => evaluate(`document.querySelector('[data-slot="select-trigger"]')?.textContent.includes("Pending") && [...document.querySelectorAll("table tbody tr")].length > 0 && [...document.querySelectorAll("table tbody tr")].every((row) => row.textContent.includes("PENDING"))`), "pending filter");
  await capture("suppliers-filtered.png");

  taxId = `VF-PORTFOLIO-${Date.now()}`;
  await navigate("/suppliers/new");
  await until(() => evaluate(`!!document.querySelector('input[name="legal_name"]')`), "supplier form");
  await fill('input[name="legal_name"]', "Northstar Components Ltd");
  await fill('input[name="trade_name"]', "Northstar Components");
  await fill('input[name="tax_id"]', taxId);
  await fill('input[name="email"]', "contact@northstar.example");
  await capture("supplier-create.png");
  await click(`[...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Create supplier")`);
  await until(() => evaluate(`/^\\/suppliers\\/\\d+$/.test(location.pathname) && document.querySelector("h1")?.textContent === "Northstar Components"`), "created supplier");
  await until(() => evaluate(`document.body.innerText.includes("PENDING")`), "pending status");
  await capture("supplier-pending.png");

  await click(`[...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Approve")`);
  await until(() => evaluate(`document.querySelector('[data-slot="alert-dialog-title"]')?.textContent === "Approve supplier?"`), "approval dialog");
  await capture("supplier-approve.png");
  await click(`document.querySelector('[data-slot="alert-dialog-action"]')`);
  await until(() => evaluate(`document.body.innerText.includes("PENDING → APPROVED") && !document.querySelector('[data-slot="alert-dialog-content"]')`), "approved history");
  await capture("supplier-approved.png");
  await evaluate(`document.getElementById("history-heading").scrollIntoView({block:"center"})`);
  await capture("status-history.png");

  const output = resolve("../docs/screenshots");
  if (!existsSync(output)) throw new Error(`Screenshot directory missing: ${output}`);
  for (const [name, bytes] of captures) writeFileSync(join(output, name), bytes);
  console.log(`Saved ${captures.size} screenshots to ${output}`);
} finally {
  if (taxId && organizationId && token) {
    try {
      await removeTemporarySupplier();
    } catch (error) {
      console.error("Check temporary supplier cleanup:", error.message);
      process.exitCode = 1;
    }
  }
  socket?.close();
  chrome.kill();
  await sleep(500);
  removeTemporaryProfile();
}
