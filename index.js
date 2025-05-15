import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { stringify, parse } from "devalue";

export function start({ log, host, runtime }) {
  if (typeof log !== "string") {
    throw new Error(`Please provide file for logs: ${typeof log}`);
  }
  const resolved = host
    ? Object.fromEntries(
        Object.entries(host).map(([route, filePath]) => {
          if (!route.startsWith("/")) {
            throw new Error(`Invalid route ${route}, must start with "/"`);
          }
          return [route, path.resolve(filePath)];
        })
      )
    : undefined;
  const config = JSON.stringify({ host: resolved });
  const out = fs.openSync(log, "a");
  const err = fs.openSync(log, "a");

  var child = spawn(
    runtime || process.argv0 || "node",
    ["--eval", `global.config=${config};import("detached/server");`],
    {
      detached: true,
      stdio: ["ignore", out, err],
    }
  );

  child.unref();
}

export function finish() {
  const transmission = http.get("http://127.0.0.1:8007/finish", () => {});
  transmission.on("error", (err) => {
    console.error(`Failed to connect to server: ${err}`);
  });
}

export function request(path, payload) {
  return new Promise((resolve, reject) => {
    const outgoing = stringify({ payload });

    const transmission = http
      .request(
        {
          hostname: "127.0.0.1",
          port: 8007,
          method: "POST",
          path,
          headers: {
            "Content-Type": "text/devalue",
            "Content-Length": Buffer.byteLength(outgoing),
          },
        },
        (incoming) => {
          const chunks = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.on("end", () => {
            try {
              const text = Buffer.concat(chunks).toString("utf8");
              const output =
                incoming.headers["content-type"] === "text/plain"
                  ? text
                  : parse(text).result;
              resolve(output);
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on("error", (e) => {
        console.error("[Detached Request] error: " + e.message);
        reject(e);
      });

    transmission.write(outgoing);
    transmission.end();
  });
}

export async function loadModuleFromCwd(filePath) {
  const resolvedPath = path.resolve(filePath);
  const stats = fs.statSync(resolvedPath);
  const mtime = stats.mtime.getTime();
  return import(`${resolvedPath}?${mtime}`);
}
