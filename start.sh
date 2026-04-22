#!/bin/bash
set -e

echo ""
echo " =========================================="
echo "   ADE - Your Local AI Assistant"
echo " =========================================="
echo ""

# --- Check for required tools ---
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "[ERROR] '$1' is not installed. $2"
    exit 1
  fi
}
check_cmd node    "Install from https://nodejs.org"
check_cmd ollama  "Install from https://ollama.ai"

# --- Install npm dependencies if missing ---
if [ ! -d "node_modules" ]; then
  echo "[1/2] Installing Node.js dependencies..."
  npm install
fi

# --- Pull Gemma 2B model ---
echo "[2/2] Ensuring Gemma 2B model is available..."
ollama pull gemma:2b

echo ""
echo " Starting services..."
echo " - AI Chat:    http://localhost:3000"
echo ""

# --- Start Voice Engine (background) ---
if [ -d "voice_engine" ]; then
  echo " Starting Voice Engine (STT/TTS)..."
  cd voice_engine
  if [ ! -d "venv" ]; then
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
  fi
  ./venv/bin/python main.py > ../voice_engine.log 2>&1 &
  VOICE_PID=$!
  cd ..
  echo " - Voice Engine: http://localhost:5001 (PID: $VOICE_PID)"
fi

# --- Start Next.js (blocks) ---
npm run dev

# --- Cleanup on exit ---
trap "kill $VOICE_PID 2>/dev/null || true; echo 'Ade stopped.'" EXIT
