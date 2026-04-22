# Ade ⚡ — Your Ultra-Fast Local AI Assistant

Ade is a private, lightning-fast AI companion that lives entirely on your computer. No cloud, no subscriptions, and 100% privacy. 

Built for speed, Ade features **real-time voice interaction** with sub-2-second response times, powered by local neural models.

---

## 🚀 How to Get Started (No Coding Required!)

Follow these 3 simple steps to get Ade running on your machine.

### Step 1: Install the "Brains" 🧠
You need two main tools to run Ade:
1.  **Ollama**: This runs the AI model (Gemma 2B).
    *   👉 [Download Ollama here](https://ollama.ai) (Click Download and run the installer).
2.  **Node.js**: This runs the app interface.
    *   👉 [Download Node.js here](https://nodejs.org) (Choose the **LTS** version).
3.  **Python**: This handles the voice engine (STT/TTS).
    *   👉 [Download Python here](https://python.org) (Make sure to check "Add Python to PATH" during installation).

### Step 2: Download the Model 📥
Once Ollama is installed, open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and type:
```bash
ollama pull gemma:2b
```

### Step 3: Run Ade! ⚡
Go to the folder where you downloaded Ade and:

**On Windows:**
*   Double-click the file named `start.bat`.

**On Mac or Linux:**
1.  Open your terminal in the folder.
2.  Type `chmod +x start.sh` (only need to do this once).
3.  Type `./start.sh`.

**That's it!** Open your browser to [http://localhost:3000](http://localhost:3000) and start chatting!

---

## 🎙️ Voice Mode
Ade is optimized for voice. 
1.  Click the **"Voice Off"** button in the top right to enable voice.
2.  Click the **Microphone** icon to start speaking.
3.  Click it again when you're done. 
4.  Ade will transcribe your speech and talk back to you in **under 2 seconds!**

---

## 🛠️ Features
*   **100% Local**: No data ever leaves your device.
*   **Gemma 2B Power**: Small but mighty model for fast, witty responses.
*   **Sentence Streaming**: Starts talking back as soon as the first sentence is ready.
*   **Premium Dark UI**: A sleek, modern interface designed for focus.

---

## ❓ Troubleshooting

| Common Issue | How to Fix |
| :--- | :--- |
| **"Command not found"** | Make sure you restarted your terminal after installing Node.js or Ollama. |
| **"Microphone access denied"** | Click the lock icon in your browser's address bar and allow microphone permissions. |
| **Slow responses** | Close other heavy apps (like games or video editors) to free up CPU/GPU. |
| **Nothing happens when I click mic** | Make sure the `voice_engine` is running (check the terminal logs). |

---

## 📜 License
MIT License. Feel free to use, modify, and share!
