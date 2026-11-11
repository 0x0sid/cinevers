import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// This repository is the FRONTEND only. The guard keeps server code, server settings and engine wording out of it.
// The forbidden words are assembled from parts so that this file does not contain them itself.
const w = (...parts: string[]) => parts.join("");
const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set(["node_modules", ".next", ".git", "package-lock.json"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(path.relative(ROOT, p).split(path.sep).join("/"));
  }
  return out;
}
const files = walk(ROOT);

const FORBIDDEN_PATHS = [
  new RegExp("^app/" + w("a", "pi") + "(/|$)"),
  new RegExp("^" + w("middle", "ware") + "\\."),
  new RegExp("^lib/(" + ["st" + "ore", "jo" + "bs", "in" + "take", "hand" + "lers", "bl" + "ob", "au" + "th", "con" + "fig", "fil" + "ter", "ra" + "te"].join("|") + ")(\\.|/)"),
  new RegExp("^app/" + w("ad", "min")),
];
const FORBIDDEN_WORDS: [string, RegExp][] = [
  [w("WORKER", "_SECRET"), new RegExp(w("WORKER", "_SECRET"))],
  [w("AD", "MIN"), new RegExp("\\b" + w("ad", "min") + "\\b", "i")],
  [w("DAILY", "_CAP"), new RegExp(w("DAILY", "_CAP"))],
  [w("pre", "sets"), new RegExp("\\b" + w("pre", "sets?") + "\\b", "i")],
  [w("see", "dance"), new RegExp(w("see", "dance"), "i")],
  [w("a", "rk"), new RegExp("\\b" + w("a", "rk") + "\\b|" + w("A", "RK_API"), "i")],
  [w("in", "take"), new RegExp("\\b" + w("in", "take") + "\\b", "i")],
  [w("server", "-only"), new RegExp(w("server", "-only"))],
  [w("node", ":"), new RegExp("from [\"']" + w("node", ":"))],
  [w("@ups", "tash"), new RegExp(w("@ups", "tash"))],
  [w("@vercel/", "b", "lob"), new RegExp(w("@vercel/", "b", "lob"))],
  ["server-lib import", new RegExp("from [\"'][^\"']*/(" + [w("st", "ore"), w("jo", "bs"), w("hand", "lers"), w("bl", "ob")].join("|") + ")[\"']")],
];
const TEXT = /\.(ts|tsx|mjs|css|json|md|yml|yaml|example)$|^\.(gitignore|env\.example)$/;

describe("frontend-only guard", () => {
  it("has no server code paths", () => {
    for (const f of files) for (const re of FORBIDDEN_PATHS) expect(f, `${f} must not exist in the frontend repo`).not.toMatch(re);
  });
  it("has no server settings, engine wording or imports of server modules in any file", () => {
    for (const f of files.filter((x) => TEXT.test(x))) {
      const txt = fs.readFileSync(path.join(ROOT, f), "utf-8");
      for (const [name, re] of FORBIDDEN_WORDS) {
        if (name === w("node", ":") && !/^(app|components|lib)\//.test(f)) continue;           // tooling and tests run in Node; the site code must not import it
        expect(txt, `${f}: ${name}`).not.toMatch(re);
      }
    }
  });
  it(".env.example holds exactly one setting: the API URL", () => {
    const lines = fs.readFileSync(path.join(ROOT, ".env.example"), "utf-8").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));          // Windows checkouts have CRLF
    expect(lines).toEqual(["NEXT_PUBLIC_CINEVERS_API_URL=https://www.cinevers.xyz"]);
  });
  it("reads all data through the typed client (no raw fetch to the API outside lib/cinevers)", () => {
    for (const f of files.filter((x) => /\.(ts|tsx)$/.test(x) && !x.startsWith("lib/cinevers/") && !x.startsWith("tests/"))) {
      const txt = fs.readFileSync(path.join(ROOT, f), "utf-8");
      expect(txt, f).not.toMatch(/fetch\(\s*[`"']\/api\//);
    }
  });
});
