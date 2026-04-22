@echo off
title Ade AI - Startup
color 0B

echo.
echo  ==========================================
echo    ADE - Your Local AI Assistant
echo  ==========================================
echo.

REM --- Check for required tools ---
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed. Download from https://nodejs.org
  pause & exit /b 1
)

where ollama >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Ollama is not installed. Download from https://ollama.ai
  pause & exit /b 1
)

REM --- Install npm dependencies if missing ---
if not exist "node_modules\" (
  echo [1/2] Installing Node.js dependencies...
  call npm install
)

REM --- Pull Gemma 2B model if not already pulled ---
echo [2/2] Ensuring Gemma 2B model is available...
ollama pull gemma:2b

echo.
echo  Starting services...
echo  - AI Chat:    http://localhost:3000
echo.

REM --- Start Voice Engine (background) ---
if exist "voice_engine\" (
  echo  Starting Voice Engine (STT/TTS)...
  cd voice_engine
  if not exist "venv\" (
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
  )
  start /B venv\Scripts\python main.py
  cd ..
)

REM --- Start Next.js dev server ---
start "" http://localhost:3000
npm run dev
