import {spawn} from "child_process";
import {exec} from "child_process";
import fs from "fs"
import os from "os";
const configPath = `${os.homedir()}/.config/playit_gg/playit.toml`;

const arg = process.argv[2];

function extractSecretCode(output) {
  const match = output.match(/[a-f0-9]{64}(?![\s\S]*[a-f0-9]{64})/i);
  return match ? match[0] : null;
}

function login() {
const prs = spawn("playit-cli", ["claim", "generate"]);

prs.stdout.on("data", (data) => {
  // Remove ANSI escape sequences and clean the string
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
  console.log("playit url", `https://playit.gg/claim/${claimCode}`);

  setTimeout(() => {
    console.log(`Attempting to exchange code: "${claimCode}"`);
    
    exec(`playit-cli claim exchange "${claimCode}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exchange error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Exchange stderr: ${stderr}`);
      }
      let out = JSON.stringify(stdout)
      out = extractSecretCode(out)
      console.log(`Exchange output: ${out}`);
      try {
       fs.writeFileSync(configPath, `secret_key = "${out}" \n`, "utf-8")
       console.log("secret write done");
     } catch (err) {
	console.log("error writting secret", err);
    }
    });
  }, 3000);
});

prs.stderr.on("data", (error) => {
  console.error("Generate error:", error.toString());
});

}


function start() {
 exec("playit-cli", (err, stdout, stdin) => {
     if(err) throw err;
     if(stdin) console.error(stdin)
     console.log(stdout)
 })
};

function list() {
exec("playit-cli tunnels list", (err, stdout, stdin) => {
   if(err) throw err;
   if(stdin) console.log(stdin)
   console.log(stdout);
})}

if(arg === "--login") {
   login()
} else if (arg === "--list") {
   list()
}else {
  start()
}
