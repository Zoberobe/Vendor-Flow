import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const docs = new URL("../../docs/", import.meta.url);
const screenshot = (name) => new URL(`screenshots/${name}`, docs);
const stages = [
  ["suppliers-list.png", "01 / LISTA", "Encontre fornecedores e acompanhe os status"],
  ["supplier-create.png", "02 / CADASTRO", "Crie um fornecedor com dados fictícios"],
  ["supplier-pending.png", "03 / REVISÃO", "O novo fornecedor começa como pendente"],
  ["supplier-approve.png", "04 / APROVAÇÃO", "Confirme a decisão antes de aplicá-la"],
  ["supplier-approved.png", "05 / RESULTADO", "O status passa a aprovado"],
  ["status-history.png", "06 / HISTÓRICO", "Veja a decisão, o autor e a data"],
];
const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const frameWidth = 1016;
const frameHeight = 890;
const frameBuffers = [];
for (const [file, eyebrow, title] of stages) {
  const source = await readFile(screenshot(file));
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1280 || metadata.height !== 800) {
    throw new Error(`${file} must be a 1280×800 browser screenshot`);
  }
  const content = await sharp(source).extract({ left: 248, top: 0, width: 1016, height: 800 }).png().toBuffer();
  const header = Buffer.from(`<svg width="1016" height="90" xmlns="http://www.w3.org/2000/svg">
    <rect width="1016" height="90" fill="#0d1833"/>
    <rect x="24" y="22" width="5" height="46" rx="2.5" fill="#4b6df5"/>
    <text x="46" y="38" fill="#a9bbed" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2">${escapeXml(eyebrow)}</text>
    <text x="46" y="68" fill="#ffffff" font-family="Arial, sans-serif" font-size="26" font-weight="700">${escapeXml(title)}</text>
    <text x="987" y="55" fill="#a9bbed" text-anchor="end" font-family="Arial, sans-serif" font-size="17">VendorFlow</text>
  </svg>`);
  const raw = await sharp({ create: { width: frameWidth, height: frameHeight, channels: 4, background: "#f7f8fb" } })
    .composite([{ input: header, top: 0, left: 0 }, { input: content, top: 90, left: 0 }])
    .ensureAlpha().raw().toBuffer();
  frameBuffers.push(raw);
}
const gif = await sharp(Buffer.concat(frameBuffers), {
  raw: { width: frameWidth, height: frameHeight * frameBuffers.length, pageHeight: frameHeight, channels: 4 },
  animated: true,
}).gif({ delay: [1700, 2200, 1700, 2300, 1700, 2700], loop: 0, effort: 8, colours: 160 }).toBuffer();
await writeFile(new URL("demo.gif", docs), gif);

const history = await readFile(screenshot("status-history.png"));
const preview = await sharp(history)
  .extract({ left: 280, top: 50, width: 950, height: 720 })
  .resize(720, 546)
  .png().toBuffer();
const coverSvg = Buffer.from(`<svg width="1400" height="620" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1734"/>
      <stop offset="1" stop-color="#173363"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="620" fill="url(#background)"/>
  <circle cx="1260" cy="-80" r="290" fill="#315de0" opacity=".14"/>
  <circle cx="120" cy="680" r="260" fill="#315de0" opacity=".10"/>
  <rect x="58" y="47" width="191" height="31" rx="15" fill="#24447f"/>
  <text x="153" y="68" fill="#c8d7ff" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="1">FULL-STACK DEMO</text>
  <text x="58" y="160" fill="#ffffff" font-family="Arial, sans-serif" font-size="67" font-weight="700">VendorFlow</text>
  <text x="58" y="215" fill="#b9cafa" font-family="Arial, sans-serif" font-size="26">Fornecedores, permissões e decisões</text>
  <text x="58" y="253" fill="#b9cafa" font-family="Arial, sans-serif" font-size="26">em um único fluxo auditável.</text>
  <rect x="58" y="300" width="478" height="1" fill="#5570a5" opacity=".7"/>
  <circle cx="76" cy="363" r="18" fill="#365cd4"/><text x="76" y="370" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700">1</text>
  <text x="113" y="372" fill="#fff" font-family="Arial, sans-serif" font-size="25" font-weight="700">Cadastre</text>
  <circle cx="76" cy="434" r="18" fill="#365cd4"/><text x="76" y="441" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700">2</text>
  <text x="113" y="443" fill="#fff" font-family="Arial, sans-serif" font-size="25" font-weight="700">Aprove</text>
  <circle cx="76" cy="505" r="18" fill="#365cd4"/><text x="76" y="512" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700">3</text>
  <text x="113" y="514" fill="#fff" font-family="Arial, sans-serif" font-size="25" font-weight="700">Audite o histórico</text>
  <text x="58" y="582" fill="#a9bbed" font-family="Arial, sans-serif" font-size="16">Multi-tenant  ·  RBAC  ·  Django API  ·  React</text>
  <rect x="622" y="27" width="746" height="572" rx="23" fill="#314c7a" opacity=".48"/>
  <rect x="630" y="34" width="730" height="560" rx="18" fill="#f7f8fb"/>
  <rect x="635" y="39" width="720" height="546" fill="#ffffff"/>
  <rect x="630" y="34" width="730" height="560" rx="18" fill="none" stroke="#829bc4" stroke-width="2"/>
</svg>`);
const cover = await sharp(coverSvg).composite([{ input: preview, left: 635, top: 39 }]).png().toBuffer();
await writeFile(new URL("cover.png", docs), cover);
console.log(`Generated cover.png (1400×620) and demo.gif (${stages.length} frames, ${frameWidth}×${frameHeight})`);
