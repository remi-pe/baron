#!/usr/bin/env python3
import whisper
import sys
import os

def transcribe_audio(audio_path, model_size="base", language=None):
    """Transcribe audio file using Whisper"""
    
    if not os.path.exists(audio_path):
        print(f"Error: File '{audio_path}' not found!")
        return
    
    print(f"Loading Whisper model: {model_size}")
    model = whisper.load_model(model_size)
    
    print(f"Transcribing: {audio_path}")
    result = model.transcribe(audio_path, language=language)
    
    print("\n" + "="*50)
    print("TRANSCRIPTION RESULT:")
    print("="*50)
    print(result["text"])
    print("="*50)
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 whisper_transcribe.py <audio_file> [model_size] [language]")
        print("Example: python3 whisper_transcribe.py audio.mp3 base English")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    language = sys.argv[3] if len(sys.argv) > 3 else None
    
    transcribe_audio(audio_file, model_size, language)
