"""
Configuration settings for the reel automation pipeline.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Keys
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
RUNWARE_API_KEY = os.getenv("RUNWARE_API_KEY", "")
WAVESPEED_API_KEY = os.getenv("WAVESPEED_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
HEDRA_API_KEY = os.getenv("HEDRA_API_KEY", "")

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
TEMP_DIR = PROJECT_ROOT / "temp"

# Video settings (Runware requires multiples of 64)
VIDEO_WIDTH = 768   # 64 * 12
VIDEO_HEIGHT = 1344  # 64 * 21 (approx 9:16 ratio)
VIDEO_FPS = 30
VIDEO_ASPECT_RATIO = "9:16"

# Runware settings (이미지 생성)
RUNWARE_IMAGE_MODEL = "runware:100@1"  # Nano Banana 2

# WaveSpeed settings (영상 생성)
WAVESPEED_VIDEO_MODEL = "wavespeed-ai/wan-2.1-i2v-480p"

# ElevenLabs settings
ELEVENLABS_MODEL_ID = "eleven_multilingual_v2"

# Subtitle settings
SUBTITLE_FONT = "AppleSDGothicNeo"
SUBTITLE_FONT_SIZE = 60
SUBTITLE_COLOR = "white"
SUBTITLE_BORDER_COLOR = "black"
SUBTITLE_BORDER_WIDTH = 3
SUBTITLE_Y_POSITION = 0.75

# Watermark
WATERMARK_TEXT = "@health_fact_bot"
WATERMARK_Y_POSITION = 0.85
