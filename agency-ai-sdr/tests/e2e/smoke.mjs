// Teste E2E (navegador real, Playwright) contra um servidor em execução.
// Uso: BASE_URL=http://localhost:3000 WHATSAPP_APP_SECRET=... WHATSAPP_WEBHOOK_VERIFY_TOKEN=... node tests/e2e/smoke.mjs
// Cobre o que não depende de um projeto Supabase real: proteção de rotas, login, cabeçalhos,
// webhook (assinatura/limites), health check e layout responsivo.
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";

// Playwright: dependência do projeto ou instalação global (via require, que respeita NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.WHATSAPP_APP_SECRET ?? "";
const verify = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "";
const shots = process.env.SCREENSHOT_DIR;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // 1) Rotas do painel exigem login (e preservam o destino)
  for (const path of ["/", "/empresas", "/leads", "/conversas", "/agentes", "/campanhas", "/reunioes", "/vendas", "/relatorios", "/custos", "/monitoramento", "/notificacoes", "/configuracoes"]) {
    await page.goto(base + path);
    const u = new URL(page.url());
    check(`protegida ${path}`, u.pathname === "/login" && u.searchParams.get("next") === path, page.url());
  }
  const csv = await page.request.get(`${base}/api/relatorios/csv?de=2026-11-01&ate=2026-11-02`, { maxRedirects: 0 });
  check("CSV exige login", [307, 401].includes(csv.status()), String(csv.status()));

  // 2) Login: formulário, erro genérico (não revela se o e-mail existe), layout mobile
  await page.goto(`${base}/login`);
  await page.fill('input[name="email"]', "alguem@exemplo.com");
  await page.fill('input[name="password"]', "senha-incorreta-123");
  await page.click('button[type="submit"]');
  // p[role=alert] = mensagem do formulário (o Next.js também tem um anunciador de rotas com role=alert)
  const alert = await page.locator('form p[role="alert"]').textContent({ timeout: 15000 }).catch(() => null);
  // Neste teste o Supabase está inacessível de propósito: a mensagem deve apontar a causa real (configuração/conexão).
  check("login informa a causa do erro", /E-mail ou senha incorretos|Não foi possível conectar ao Supabase|Configuração do Supabase/.test(alert ?? ""), alert ?? "sem mensagem");
  check("login sem rolagem horizontal (390px)", !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  if (shots) await page.screenshot({ path: `${shots}/e2e-login.png` });

  // 3) Páginas públicas
  await page.goto(`${base}/privacidade`);
  check("política de privacidade", (await page.locator("h1").textContent())?.includes("Política de privacidade"));
  check("privacidade cita descadastro", (await page.content()).includes("PARAR"));

  // 4) Cabeçalhos de segurança
  const res = await page.request.get(`${base}/login`);
  const h = res.headers();
  check("CSP presente", (h["content-security-policy"] ?? "").includes("frame-ancestors 'none'"), h["content-security-policy"]);
  check("X-Frame-Options DENY", h["x-frame-options"] === "DENY");
  check("nosniff", h["x-content-type-options"] === "nosniff");
  check("HSTS", (h["strict-transport-security"] ?? "").includes("max-age"));
  check("sem X-Powered-By", !h["x-powered-by"]);

  // 5) Health check
  const basic = await page.request.get(`${base}/api/health`);
  check("health básico 200", basic.status() === 200);
  const deepNoToken = await page.request.get(`${base}/api/health?deep=1`);
  check("health profundo exige token", deepNoToken.status() === 401);
  const deepBad = await page.request.get(`${base}/api/health?deep=1`, { headers: { authorization: "Bearer " + "x".repeat(40) } });
  check("health profundo rejeita token errado", deepBad.status() === 401);

  // 6) Webhook do WhatsApp
  const wh = `${base}/api/webhooks/whatsapp`;
  const ok = await page.request.get(`${wh}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verify)}&hub.challenge=777`);
  check("webhook: verificação correta", ok.status() === 200 && (await ok.text()) === "777");
  const bad = await page.request.get(`${wh}?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1`);
  check("webhook: token errado 403", bad.status() === 403);
  const injected = await page.request.get(`${wh}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verify)}&hub.challenge=${encodeURIComponent("<script>")}`);
  check("webhook: challenge malicioso recusado", injected.status() === 403);
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const noSig = await page.request.post(wh, { data: body, headers: { "content-type": "application/json" } });
  check("webhook: sem assinatura 401", noSig.status() === 401);
  const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const signed = await page.request.post(wh, { data: body, headers: { "content-type": "application/json", "x-hub-signature-256": sig } });
  check("webhook: assinado 200", signed.status() === 200);
  const tampered = await page.request.post(wh, { data: body.replace("[]", "[{}]"), headers: { "content-type": "application/json", "x-hub-signature-256": sig } });
  check("webhook: corpo alterado 401", tampered.status() === 401);
  const big = await page.request.post(wh, { data: "x".repeat(1_100_000), headers: { "content-type": "application/json", "x-hub-signature-256": sig } });
  check("webhook: corpo grande 413", big.status() === 413);
} finally {
  await browser.close();
}

for (const r of results) console.log(`${r.ok ? "✔" : "✖"} ${r.name}${r.ok ? "" : ` — ${r.detail}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `✖ ${failed} de ${results.length} verificações falharam` : `✔ ${results.length} verificações E2E passaram`);
process.exit(failed ? 1 : 0);
