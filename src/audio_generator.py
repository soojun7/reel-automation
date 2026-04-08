"""
Audio generator using ElevenLabs API for Korean TTS.
"""
import asyncio
import aiohttp
from pathlib import Path
from typing import Optional, List
import logging

from models import Segment, Script
from config import (
    ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID,
    ELEVENLABS_MODEL_ID,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ElevenLabsGenerator:
    """Generate speech using ElevenLabs API."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(
        self,
        api_key: str = ELEVENLABS_API_KEY,
        voice_id: str = ELEVENLABS_VOICE_ID,
        model_id: str = ELEVENLABS_MODEL_ID
    ):
        self.api_key = api_key
        self.voice_id = voice_id
        self.model_id = model_id
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "xi-api-key": self.api_key,
                "Content-Type": "application/json"
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def list_voices(self) -> List[dict]:
        """List available voices."""
        if not self.session:
            raise RuntimeError("Session not initialized.")

        try:
            async with self.session.get(f"{self.BASE_URL}/voices") as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("voices", [])
        except Exception as e:
            logger.error(f"Error listing voices: {e}")
        return []

    async def generate_speech(
        self,
        text: str,
        output_path: Path,
        voice_settings: Optional[dict] = None
    ) -> Optional[Path]:
        """Generate speech from text."""

        if not self.session:
            raise RuntimeError("Session not initialized.")

        # Voice settings for energetic Korean narration
        default_settings = {
            "stability": 0.3,
            "similarity_boost": 0.85,
            "style": 0.6,
            "use_speaker_boost": True
        }

        settings = voice_settings or default_settings

        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": settings
        }

        try:
            url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}"

            async with self.session.post(
                url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"ElevenLabs API error: {response.status} - {error_text}")
                    return None

                audio_bytes = await response.read()

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as f:
                    f.write(audio_bytes)

                logger.info(f"Audio saved to {output_path}")
                return output_path

        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return None

    async def generate_segment_audio(
        self,
        segment: Segment,
        output_dir: Path
    ) -> Optional[Path]:
        """Generate audio for a single segment."""

        if not segment.audio_text:
            logger.warning(f"No audio text for segment {segment.id}")
            return None

        output_path = output_dir / f"seg{segment.id:02d}_audio.mp3"
        return await self.generate_speech(segment.audio_text, output_path)

    async def generate_full_narration(
        self,
        script: Script,
        output_path: Path
    ) -> Optional[Path]:
        """Generate full narration for entire script."""

        full_text = script.get_full_narration()
        if not full_text:
            return None

        return await self.generate_speech(full_text, output_path)


async def generate_all_audio(
    segments: List[Segment],
    output_dir: Path
) -> dict:
    """Generate audio for all segments."""

    all_audio = {}
    output_dir.mkdir(parents=True, exist_ok=True)

    async with ElevenLabsGenerator() as generator:
        for segment in segments:
            audio_path = await generator.generate_segment_audio(segment, output_dir)

            if audio_path:
                all_audio[segment.id] = audio_path
                logger.info(f"Generated audio for segment {segment.id}")

            await asyncio.sleep(0.5)

    return all_audio


def get_audio_duration(audio_path: Path) -> float:
    """Get duration of audio file using ffprobe."""
    import subprocess

    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio_path)],
            capture_output=True, text=True
        )
        return float(result.stdout.strip())
    except:
        return 0.0


if __name__ == "__main__":
    async def test():
        async with ElevenLabsGenerator() as generator:
            voices = await generator.list_voices()
            print("Available voices:")
            for v in voices[:5]:
                print(f"  - {v['name']} ({v['voice_id']})")

            # Test
            result = await generator.generate_speech(
                "나 루테인이야! 빈속에 날 먹어?",
                Path("/tmp/test_audio.mp3")
            )
            if result:
                print(f"Test audio: {result}")

    asyncio.run(test())
