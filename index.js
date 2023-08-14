function start({ log, host }) {
  const fs = require("fs");
  const spawn = require("child_process").spawn;
  if (typeof log !== "string") {
    throw new Error(`Unsupported value for log: ${typeof log}`);
  }
  const resolved = host
    ? Object.fromEntries(
        Object.entries(host).map(([route, path]) => {
          return [route, require("path").resolve(path)];
        })
      )
    : undefined;
  const config = JSON.stringify({ host: resolved });
  const out = fs.openSync(log, "a");
  const err = fs.openSync(log, "a");

  var child = spawn(
    "node",
    ["--eval", `global.config = ${config};require("detached/server");`],
    {
      detached: true,
      stdio: ["ignore", out, err],
    }
  );

  child.unref();
}

function finish() {
  const transmission = require("http").get(
    "http://127.0.0.1:8007/finish",
    () => {}
  );
  transmission.on("error", (err) => {
    console.log(`Failed to connect to server: ${err}`);
  });
}

function request(path, payload) {
  return new Promise((resolve, reject) => {
    const outgoing = JSON.stringify({ payload });

    const transmission = require("http")
      .request(
        {
          hostname: "127.0.0.1",
          port: 8007,
          method: "POST",
          path,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(outgoing),
          },
        },
        (stream) => {
          const chunks = [];
          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("end", () => {
            try {
              const incoming = Buffer.concat(chunks).toString("utf8");
              const data = JSON.parse(incoming);
              resolve(data.result);
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

module.exports = {
  start,
  finish,
  request,
};
