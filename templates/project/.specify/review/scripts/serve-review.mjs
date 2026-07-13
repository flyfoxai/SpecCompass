#!/usr/bin/env node

import { createServer, request as httpRequest } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LOOPBACK_HOST = "127.0.0.1";
const SELF_CHECK_TIMEOUT_MS = 5_000;
const FEATURE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".eot", "application/vnd.ms-fontobject"],
  [".txt", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"]
]);

let server = null;
let shuttingDown = false;

function usageError(message) {
  throw new Error(
    `${message}\nUsage: node .specify/review/scripts/serve-review.mjs (--flow <feature> | --ui <feature>) [--port <0-65535>]`
  );
}

function parseArguments(argv) {
  let reviewType = null;
  let feature = null;
  let port = 0;
  let sawPort = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--flow" || argument === "--ui") {
      if (reviewType) usageError("Provide exactly one of --flow or --ui.");
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usageError(`${argument} requires a feature.`);
      reviewType = argument.slice(2);
      feature = value;
      index += 1;
      continue;
    }
    if (argument === "--port") {
      if (sawPort) usageError("Provide --port at most once.");
      const value = argv[index + 1];
      if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) {
        usageError("--port must be a decimal integer from 0 to 65535.");
      }
      port = Number(value);
      if (!Number.isSafeInteger(port) || port > 65_535) {
        usageError("--port must be a decimal integer from 0 to 65535.");
      }
      sawPort = true;
      index += 1;
      continue;
    }
    usageError(`Unknown argument: ${argument}`);
  }

  if (!reviewType || !feature) usageError("Provide exactly one of --flow or --ui.");
  if (!FEATURE_PATTERN.test(feature) || feature.includes("..")) {
    usageError("Feature must start with an alphanumeric character and contain only letters, digits, dots, underscores, or hyphens, without '..'.");
  }
  return { reviewType, feature, port };
}

function isWithin(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function requireRegularFile(projectRoot, realProjectRoot, path) {
  const absolutePath = resolve(projectRoot, path);
  if (!isWithin(projectRoot, absolutePath)) throw new Error(`Required path escapes project root: ${path}`);
  const realPath = await realpath(absolutePath);
  if (!isWithin(realProjectRoot, realPath)) throw new Error(`Required path escapes project root: ${path}`);
  const details = await stat(realPath);
  if (!details.isFile()) throw new Error(`Required path is not a file: ${path}`);
  return realPath;
}

function responseHeaders(contentType, contentLength) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (contentLength !== undefined) headers["Content-Length"] = String(contentLength);
  return headers;
}

function sendText(response, status, message, extraHeaders = {}) {
  const body = Buffer.from(`${message}\n`, "utf-8");
  response.writeHead(status, {
    ...responseHeaders("text/plain; charset=utf-8", body.length),
    ...extraHeaders
  });
  response.end(body);
}

function createRequestHandler({ projectRoot, realProjectRoot, expectedHost }) {
  return async (request, response) => {
    if (request.headers.host !== expectedHost) {
      sendText(response, 403, "Forbidden host.");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method not allowed.", { Allow: "GET, HEAD" });
      return;
    }

    let pathname;
    try {
      const requestUrl = new URL(request.url || "/", `http://${expectedHost}`);
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      sendText(response, 400, "Invalid request path.");
      return;
    }
    if (pathname.includes("\0") || pathname.includes("\\")) {
      sendText(response, 403, "Forbidden path.");
      return;
    }

    const absolutePath = resolve(projectRoot, `.${pathname}`);
    if (!isWithin(projectRoot, absolutePath)) {
      sendText(response, 403, "Forbidden path.");
      return;
    }

    try {
      const realPath = await realpath(absolutePath);
      if (!isWithin(realProjectRoot, realPath)) {
        sendText(response, 403, "Forbidden path.");
        return;
      }
      const details = await stat(realPath);
      if (!details.isFile()) {
        sendText(response, 404, "Not found.");
        return;
      }
      const body = await readFile(realPath);
      const contentType = MIME_TYPES.get(extname(realPath).toLowerCase()) || "application/octet-stream";
      response.writeHead(200, responseHeaders(contentType, body.length));
      response.end(request.method === "HEAD" ? undefined : body);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR" || error?.code === "EACCES") {
        sendText(response, 404, "Not found.");
        return;
      }
      throw error;
    }
  };
}

function checkUrl(url) {
  return new Promise((resolveCheck, rejectCheck) => {
    const request = httpRequest(url, { method: "GET", headers: { Connection: "close" } }, (response) => {
      response.resume();
      response.once("end", () => {
        if (response.statusCode === 200) {
          resolveCheck();
        } else {
          rejectCheck(new Error(`Self-check returned HTTP ${response.statusCode} for ${url}`));
        }
      });
    });
    request.setTimeout(SELF_CHECK_TIMEOUT_MS, () => {
      request.destroy(new Error(`Self-check timed out after ${SELF_CHECK_TIMEOUT_MS}ms for ${url}`));
    });
    request.once("error", rejectCheck);
    request.end();
  });
}

function shutdown(exitCode, error = null) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (error) console.error(`Review server failed: ${error.message || error}`);

  const finish = () => process.exit(exitCode);
  if (server?.listening) {
    server.close(finish);
    setTimeout(finish, 2_000).unref();
  } else {
    finish();
  }
}

async function main() {
  const { reviewType, feature, port } = parseArguments(process.argv.slice(2));
  const launcherPath = await realpath(fileURLToPath(import.meta.url));
  const projectRoot = resolve(dirname(launcherPath), "../../..");
  const realProjectRoot = await realpath(projectRoot);
  const rendererPath = ".specify/review/renderer/speccompass-review-renderer.html";
  const dataPath = reviewType === "flow"
    ? `specs/${feature}/flows/review/flow-review-data.json`
    : `specs/${feature}/ui/review/ui-review-data.json`;

  await Promise.all([
    requireRegularFile(projectRoot, realProjectRoot, rendererPath),
    requireRegularFile(projectRoot, realProjectRoot, dataPath)
  ]);

  server = createServer();
  await new Promise((resolveListening, rejectListening) => {
    const onError = (error) => rejectListening(error);
    server.once("error", onError);
    server.listen({ host: LOOPBACK_HOST, port }, () => {
      server.off("error", onError);
      resolveListening();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine review server port.");
  const expectedHost = `${LOOPBACK_HOST}:${address.port}`;
  server.on("request", (request, response) => {
    void createRequestHandler({ projectRoot, realProjectRoot, expectedHost })(request, response).catch((error) => {
      if (!response.headersSent) sendText(response, 500, "Internal server error.");
      else response.destroy();
      console.error(`Review request failed: ${error.message || error}`);
    });
  });

  const encodedFeature = encodeURIComponent(feature);
  const origin = `http://${expectedHost}`;
  const rendererUrl = `${origin}/${rendererPath}?${reviewType}=${encodedFeature}`;
  const dataUrl = `${origin}/${dataPath}`;
  await Promise.all([checkUrl(rendererUrl), checkUrl(dataUrl)]);

  console.log(`SPECCOMPASS_REVIEW_URL=${rendererUrl}`);
  console.log(`Review server is running on ${origin}. Press Ctrl+C to stop.`);
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));
process.once("uncaughtException", (error) => shutdown(1, error));
process.once("unhandledRejection", (error) => shutdown(1, error));

main().catch((error) => shutdown(1, error));
