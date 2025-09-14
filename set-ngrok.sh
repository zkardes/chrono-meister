#!/bin/bash

# Get the current ngrok URL
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)

if [ ! -z "$NGROK_URL" ]; then
    echo "🚇 Found ngrok tunnel: $NGROK_URL"
    echo "export NGROK_URL=$NGROK_URL" > .env.ngrok
    echo "✅ Environment variable set! Run: source .env.ngrok && npm run dev"
else
    echo "❌ No ngrok tunnel found. Make sure ngrok is running on port 8080."
    echo "Start ngrok with: ngrok http 8080"
fi