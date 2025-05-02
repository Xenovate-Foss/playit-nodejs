import { spawn, exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const configPath = `${os.homedir()}/.config/playit_gg/playit.toml`;
const arg = process.argv[2];

function cleanAnsi(input) {
  return input.toString().replace(/\x1B[[@-_][0-?]*[ -/]*[@-~]/g, '').trim();
}

function extractSecretCode(output) {
  const match = output.match(/[a-f0-9]{64}(?![\s\S]*[a-f0-9]{64})/i);
  return match ? match[0] : null;
}

function login() {
  const prs = spawn("playit-cli", ["claim", "generate"]);

  prs.stdout.on("data", (data) => {
    const raw = JSON.stringify(data.toString());
    const claimCode = cleanAnsi(JSON.stringify(raw));

    console.log("Raw claim code:", JSON.stringify(raw));
    console.log("Clean claim code:", claimCode);
    console.log("Visit to claim:", `https://playit.gg/claim/${claimCode}`);

    setTimeout(() => {
      console.log(`Exchanging code: "${claimCode}"`);
      exec(`playit-cli claim exchange "${claimCode}"`, (err, stdout, stderr) => {
        if (err) return console.error("Exchange error:", err.message);
        if (stderr) console.error("stderr:", stderr);

        const secret = extractSecretCode(JSON.stringify(stdout));
        if (!secret) return console.error("Secret not found!");

        try {
          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.writeFileSync(configPath, `secret_key = "${secret}"\n`, "utf-8");
          console.log("Secret key written to config.");
        } catch (e) {
          console.error("Failed to write secret:", e.message);
        }
      });
    }, 3000);
  });

  prs.stderr.on("data", (err) => {
    console.error("Claim generate error:", err.toString());
  });
}

function start() {
  const p = spawn("playit-cli", ["start"], { stdio: "inherit" });
  p.on("error", (err) => console.error("Start error:", err.message));
}

function listTunnels() {
  const p = spawn("playit-cli", ["tunnels", "list"]);
  p.stdout.on("data", (d) => console.log(cleanAnsi(d)));
  p.stderr.on("data", (d) => console.error("Error:", cleanAnsi(d)));
}

function reset() {
  const p = spawn("playit-cli", ["reset"], { stdio: "inherit" });
  p.on("error", (err) => console.error("Reset error:", err.message));
}

function showSecretPath() {
  const p = spawn("playit-cli", ["secret-path"]);
  p.stdout.on("data", (d) => console.log(cleanAnsi(d)));
  p.stderr.on("data", (d) => console.error("Error:", cleanAnsi(d)));
}

function showVersion() {
  const p = spawn("playit-cli", ["version"]);
  p.stdout.on("data", (d) => console.log(cleanAnsi(d)));
}

function help() {
  console.log(`
Usage: node playit.js [option]

Options:
  --login         Start login and write secret
  --list          List tunnels
  --start         Start the playit agent
  --reset         Reset saved secret key
  --secret-path   Show path of secret key
  --version       Show playit-cli version
  --help          Show this help message
  `);
}

// Main control
switch (arg) {
  case "--login": login(); break;
  case "--list": listTunnels(); break;
  case "--start": start(); break;
  case "--reset": reset(); break;
  case "--secret-path": showSecretPath(); break;
  case "--version": showVersion(); break;
  case "--help":
  default: help(); break;
}
