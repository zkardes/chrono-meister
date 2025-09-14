#!/bin/bash

echo "🚀 Starting development with automatic ngrok..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   brew install ngrok"
    echo "   or visit: https://ngrok.com/download"
    exit 1
fi

# Function to cleanup processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $NGROK_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start ngrok in background
echo "📡 Starting ngrok tunnel..."
ngrok http 8080 --log=stdout > /dev/null 2>&1 &
NGROK_PID=$!

# Wait for ngrok to be ready
echo "⏳ Waiting for ngrok tunnel..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:4040/api/tunnels > /dev/null 2>&1; then
        NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)
        if [ ! -z "$NGROK_URL" ]; then
            echo "✅ ngrok tunnel ready: $NGROK_URL"
            break
        fi
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Failed to start ngrok tunnel"
        exit 1
    fi
done

# Export the URL and start Vite
echo "🔧 Starting Vite dev server with ngrok URL: $NGROK_URL"
export NGROK_URL=$NGROK_URL
npm run dev &
VITE_PID=$!

# Wait for Vite to exit
wait $VITE_PID