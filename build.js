// Genera el sitio en dist/ a partir de public/ y crea una página
// que lista automáticamente todo lo que haya en public/archivos/.
// Cloudflare Pages ejecuta esto en cada push: comando "node build.js", salida "dist".

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "public");
const OUT = path.join(__dirname, "dist");
const FILES_DIR = path.join(SRC, "archivos");
const MAX_BYTES = 25 * 1024 * 1024; // límite de Cloudflare Pages por archivo

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });

function walk(dir, base = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".")) return [];
    const rel = path.posix.join(base, e.name);
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full, rel);
    const { size, mtime } = fs.statSync(full);
    return [{ rel, size, mtime }];
  });
}

const files = walk(FILES_DIR).sort((a, b) => a.rel.localeCompare(b.rel));

const tooBig = files.filter((f) => f.size > MAX_BYTES);
if (tooBig.length) {
  console.error("Estos archivos superan 25 MB y Cloudflare Pages no los publica:");
  tooBig.forEach((f) => console.error("  - archivos/" + f.rel));
  process.exit(1);
}

const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) =>
  n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(1) + " MB";

const rows = files.length
  ? files
      .map(
        (f) =>
          `<tr><td><a href="/archivos/${f.rel.split("/").map(encodeURIComponent).join("/")}">${esc(f.rel)}</a></td>` +
          `<td>${fmt(f.size)}</td></tr>`
      )
      .join("\n")
  : `<tr><td colspan="2">Todavía no hay archivos. Súbelos a la carpeta <code>public/archivos/</code>.</td></tr>`;

const html = fs.readFileSync(path.join(SRC, "index.html"), "utf8").replace("<!--LISTA-->", rows);
fs.writeFileSync(path.join(OUT, "index.html"), html);

console.log(`Sitio generado en dist/ con ${files.length} archivo(s).`);
