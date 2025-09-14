#!/usr/bin/env node

const { spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Starting development with ngrok...\n");

// Function to wait for ngrok to be ready
const waitForNgrok = () => {
  return new Promise((resolve) => {
    const checkNgrok = () => {
      exec("curl -s http://127.0.0.1:4040/api/tunnels", (error, stdout) => {
        if (!error && stdout) {
          try {
            const data = JSON.parse(stdout);
            const httpsTunnel = data.tunnels?.find(
              (tunnel) =>
                tunnel.config?.addr === "8080" && tunnel.proto === "https"
            );
            if (httpsTunnel?.public_url) {
              console.log("✅ ngrok tunnel ready:", httpsTunnel.public_url);
              resolve(httpsTunnel.public_url);
              return;
            }
          } catch (e) {}
        }
        setTimeout(checkNgrok, 1000);
      });
    };
    checkNgrok();
  });
};

// Start ngrok
console.log("📡 Starting ngrok tunnel...");
const ngrokProcess = spawn("ngrok", ["http", "8080"], {
  stdio: ["ignore", "pipe", "pipe"],
});

ngrokProcess.stdout.on("data", (data) => {
  console.log("ngrok:", data.toString().trim());
});

ngrokProcess.stderr.on("data", (data) => {
  console.log("ngrok error:", data.toString().trim());
});

// Wait for ngrok to be ready, then start Vite
waitForNgrok().then((ngrokUrl) => {
  console.log("\n🔧 Starting Vite dev server...");

  // Start Vite dev server
  const viteProcess = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: { ...process.env, NGROK_URL: ngrokUrl },
  });

  // Handle cleanup
  const cleanup = () => {
    console.log("\n🧹 Cleaning up...");
    viteProcess.kill();
    ngrokProcess.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
});
