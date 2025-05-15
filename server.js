import express from "express";
import { stringify, parse } from "devalue";

function printable(value, length = 2) {
  return String(value).padStart(length, "0");
}

function getTimestamp() {
  const date = new Date();
  return `${printable(date.getHours())}:${printable(
    date.getMinutes()
  )}:${printable(date.getSeconds())}.${printable(date.getMilliseconds(), 3)}`;
}

function shortenString(str) {
  return str.length > 40
    ? str.slice(0, 40).replace(/(?:\r\n|\r|\n)/g, "⏎") + `...${str.length}`
    : str;
}

console.log(`[${getTimestamp()}] Start ${JSON.stringify(global.config)}`);

const app = express();
const port = global.config.port || 8007;

app.use(express.text({ type: "text/devalue" }));
app.use(express.text({ type: "text/plain" }));
app.use(express.json());

app.get("/finish", (req, res) => {
  console.log(`[${getTimestamp()}] Exit requested`);
  res.send("Exiting");
  server.close(() => process.exit());
});

global.config.host &&
  Object.entries(global.config.host).forEach(([route, path]) => {
    import(path).then((runner) => {
      const handle = runner.default || runner;
      if (typeof handle != "function") {
        throw new Error(`${path} exports object instead of function`);
      }
      app.post(`${route}`, (req, res) => {
        const input = req.is("text/devalue") ? parse(req.body) : req.body;
        const data = input.payload || input;
        const info =
          typeof data === "string"
            ? data
            : typeof req.body === "string"
            ? req.body
            : JSON.stringify(data);
        console.log(
          `[${getTimestamp()}] requested ${route} ${shortenString(info)}`
        );
        handle(data).then((result) => {
          let output = result;
          if (typeof result === "string") {
            res.setHeader("content-type", "text/plain");
          } else {
            res.setHeader("content-type", "text/devalue");
            output = stringify(result);
          }
          console.log(`[${getTimestamp()}] computed ${shortenString(output)}`);
          res.send(output);
        });
      });
    });
  });

const server = app.listen(port, () => {
  console.log(`[${getTimestamp()}] Server listening on port ${port}`);
});
