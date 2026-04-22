import os
import time
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import wave
from piper.voice import PiperVoice

app = Flask(__name__)
CORS(app)

# Initialize STT Model (Tiny for speed)
print("Loading STT model...")
model_size = "tiny.en"
stt_model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=4)

# Initialize Piper TTS
print("Loading Piper TTS model...")
model_path = os.path.join(os.path.dirname(__file__), "models", "voice.onnx")
config_path = model_path + ".json"
# Check for GPU if possible (Piper on GPU is blazing fast)
# However, Piper-TTS usually runs on CPU by default in this setup.
voice = PiperVoice.load(model_path, config_path=config_path, use_cuda=False)

@app.route('/stt', methods=['POST'])
def stt():
    start_time = time.time()
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        audio_file.save(temp_audio.name)
        temp_path = temp_audio.name

    try:
        # beam_size=1 and vad_filter=True for maximum speed
        segments, info = stt_model.transcribe(temp_path, beam_size=1, vad_filter=True)
        text = " ".join([segment.text for segment in segments]).strip()
        print(f"STT Latency: {time.time() - start_time:.4f}s | Text: {text}")
        return jsonify({"text": text})
    except Exception as e:
        print(f"STT Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.route('/tts', methods=['POST'])
def tts():
    start_time = time.time()
    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_path = temp_audio.name
        temp_audio.close()

        with wave.open(temp_path, "wb") as wav_file:
            params_set = False
            for chunk in voice.synthesize(text):
                if not params_set:
                    wav_file.setnchannels(chunk.sample_channels)
                    wav_file.setsampwidth(chunk.sample_width)
                    wav_file.setframerate(chunk.sample_rate)
                    params_set = True
                wav_file.writeframes(chunk.audio_int16_bytes)
            
        print(f"TTS Latency: {time.time() - start_time:.4f}s | Text: {text[:50]}...")
        return send_file(temp_path, mimetype="audio/wav")
    except Exception as e:
        print(f"TTS Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001)
