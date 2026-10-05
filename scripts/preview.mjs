import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};
const server = http.createServer(async (req, res) => {
  try {
    const route = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (route === "/") {
      res.writeHead(302, { Location: "/preview/index.html" });
      res.end();
      return;
    }
    const allowed =
      route.startsWith("/preview/") ||
      route.startsWith("/tests/fixtures/") ||
      route.startsWith("/assets/") ||
      route === "/extension/core.js";
    if (!allowed || route.split("/").some((part) => part.startsWith(".")))
      throw Error("Denied");
    const file = path.resolve(root, "." + route);
    if (!file.startsWith(root + path.sep)) throw Error("Denied");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'none'; media-src 'self'",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.LILT_PORT ?? 48621), "127.0.0.1", () =>
  console.log(`Lilt preview: http://127.0.0.1:${server.address().port}`),
);
