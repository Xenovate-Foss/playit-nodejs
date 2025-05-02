import { spawn, exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {getPlayitBinary} from "finder-v3.js"!

const configPath = `${os.homedir()}/.config/playit_gg/playit.toml`;
const arg = process.argv[2];
const play = await getPlayitBinary({autoInstall: true})
if(play.installed) console.log("playit exist");
const playitPath = play.path

// Removes ANSI colors + all control characters (e.g., \u001b8, \x07, etc.)
function cleanAnsi(input) {
  return input
    .toString()
    .replace(/\x1B[[@-_][0-?]*[ -/]*[@-~]/g, '') // ANSI escape codes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
    .trim();
}


// Extract 64-char secret from stdout
function extractSecretCode(output) {
  const match = output.match(/[a-f0-9]{64}(?![\s\S]*[a-f0-9]{64})/i);
  return match ? match[0] : null;
}

function login() {
  const prs = spawn(playitPath, ["claim", "generate"]);

  prs.stdout.on("data", (data) => {
    const rawString = data.toString();
  const claimCode = rawString
    .replace(/\u001b\[\d+m/g, '')  // Remove color codes
    .replace(/\u001b\[\d+;\d+[A-Za-z]/g, '')  // Remove cursor movement
    .replace(/\u001b\[\??\d+[A-Za-z]/g, '')  // Remove other escape sequences
    .replace(/\u001b8/g, '')  // Remove specific escape you're seeing
    .replace(/\u001b\[0m/g, '')  // Remove reset sequence
    .trim();  // Remove whitespace

  console.log("Raw claim code:", JSON.stringify(rawString)); // Debug original
  console.log("Clean claim code:", JSON.stringify(claimCode)); // Debug cleaned version
 


    if (!claimCode) {
      console.error("Failed to extract claim code!");
      return;
    }

    console.log("Visit to claim:", `https://playit.gg/claim/${claimCode}`);

    setTimeout(() => {
      console.log(`Exchanging code: "${claimCode}"`);

      exec(`${playitPath} claim exchange "${claimCode}"`, (err, stdout, stderr) => {
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
    console.error("Claim generate error:", cleanAnsi(err));
  });
}

function start() {
  const p = spawn(playitPath, ["start"], { stdio: "inherit" });
  p.on("error", (err) => console.error("Start error:", err.message));
}

function listTunnels() {
  const p = spawn(playitPath, ["tunnels", "list"]);
  p.stdout.on("data", (d) => console.log(JSON.parse(cleanAnsi(d))));
  p.stderr.on("data", (d) => console.error("Error:", cleanAnsi(d)));
}

function reset() {
  const p = spawn(playitPath, ["reset"], { stdio: "inherit" });
  p.on("error", (err) => console.error("Reset error:", err.message));
}

function showSecretPath() {
  const p = spawn(playitPath, ["secret-path"]);
  p.stdout.on("data", (d) => console.log(cleanAnsi(d)));
  p.stderr.on("data", (d) => console.error("Error:", cleanAnsi(d)));
}

function showVersion() {
  const p = spawn(playitPath, ["version"]);
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
