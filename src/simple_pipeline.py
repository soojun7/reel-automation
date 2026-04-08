#!/usr/bin/env python3
"""
Simplified pipeline - Generate images, animate with WaveSpeed Grok, add audio.
"""
import asyncio
import logging
import base64
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import List, Optional

import aiohttp
import sys
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from config import RUNWARE_API_KEY, WAVESPEED_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, OUTPUT_DIR
import uuid

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Segment:
    """One segment = one character scene."""
    id: int
    character_name: str
    image_prompt: str      # Image generation prompt
    motion_prompt: str     # Video animation prompt (동작 연출)
    narration: str         # Audio text
    subtitle: str          # Display text
    duration: int = 6      # Video duration (6 or 10 seconds)


def create_health_tip_segments() -> List[Segment]:
    """
    Create segments with DIFFERENTIATED designs from original.
    - Different character shapes
    - Different backgrounds
    - Different color schemes
    """

    base_style = "3D cartoon animation style, cute chibi character"
    base_quality = "soft studio lighting, pastel colors, clean minimal background, vertical 9:16"

    return [
        Segment(
            id=1,
            character_name="루테인",
            # 차별화: 콩 대신 루비 보석 캐릭터, 모던 다이닝룸
            image_prompt=f"{base_style}, adorable ruby red gemstone character with small arms and legs, grumpy pouty expression with puffed cheeks, standing on modern white marble table, steaming bowl of korean bibimbap nearby, {base_quality}",
            motion_prompt="The ruby character talks angrily pointing at the food, shaking head side to side, arms gesturing expressively. Subtle camera zoom in. Sound effects only, no music no voice.",
            narration="나 루테인이야! 빈속에 날 먹으면 하나도 흡수 안 되고 다 빠져나가! 꼭 밥 먹고 먹어!",
            subtitle="나 루테인이야!",
            duration=6
        ),
        Segment(
            id=2,
            character_name="비타민D",
            # 차별화: 캡슐 대신 작은 태양 캐릭터, 코지 원룸
            image_prompt=f"{base_style}, cute little sun character with orange glow wearing tiny nightcap, frustrated sleepy expression, sitting on cozy beige sofa bed, nighttime city lights through large window, moon visible outside, {base_quality}",
            motion_prompt="The sun character yawns then gets angry, waving arms in frustration, pointing at the moon outside. Camera slowly pushes in. Sound effects only, no music no voice.",
            narration="나 비타민D야! 자기 전에 먹으면 뇌가 낮인 줄 알고 잠이 안 와! 아침에 먹어!",
            subtitle="나 비타민D야!",
            duration=6
        ),
        Segment(
            id=3,
            character_name="비타민A",
            # 차별화: 노란 캡슐 대신 당근 캐릭터, 욕실
            image_prompt=f"{base_style}, worried orange carrot character with green leaf hair, panicked expression pulling at leaf hair, strands falling, standing in modern bathroom with mirror and skincare products, {base_quality}",
            motion_prompt="The carrot character nervously pulls hair, hair strands float down, looks at mirror worried, then calms down and nods. Sound effects only, no music no voice.",
            narration="나 비타민A야! 고용량 오래 먹으면 간에 쌓여서 탈모 올 수 있어! 적정량만!",
            subtitle="나 비타민A야!",
            duration=6
        ),
        Segment(
            id=4,
            character_name="종합비타민",
            # 차별화: 알약 대신 무지개 사탕 캐릭터, 피크닉
            image_prompt=f"{base_style}, round rainbow lollipop candy character with colorful swirls, shocked disgusted expression, standing on picnic blanket in park, spilled matcha latte making green puddle, {base_quality}",
            motion_prompt="The candy character jumps back in shock from spilled tea, makes disgusted face, waves hands saying no no. Gentle camera shake. Sound effects only, no music no voice.",
            narration="나 종합비타민이야! 녹차랑 먹으면 탄닌이 영양소 다 뺏어가! 물로 먹어!",
            subtitle="나 종합비타민이야!",
            duration=6
        ),
        Segment(
            id=5,
            character_name="아연",
            # 차별화: 은색 구슬 대신 아연 원소기호 캐릭터, 미니멀 주방
            image_prompt=f"{base_style}, shiny platinum Zn letter character with metallic texture, sick nauseous green face expression holding tummy, standing on empty white ceramic plate on minimalist kitchen counter, {base_quality}",
            motion_prompt="The Zn character wobbles feeling sick, holds stomach, makes queasy face, then recovers and gives thumbs up. Sound effects only, no music no voice.",
            narration="나 아연이야! 빈속에 먹으면 위가 뒤집어져! 밥 먹고 먹어!",
            subtitle="나 아연이야!",
            duration=6
        ),
        Segment(
            id=6,
            character_name="홍삼",
            # 차별화: 스틱 대신 인삼 뿌리 캐릭터, 홈오피스
            image_prompt=f"{base_style}, cute ginseng root character with reddish brown color and root legs, angry furious expression with steam puffs from head, standing on wooden home office desk, iced coffee drink nearby, laptop in background, {base_quality}",
            motion_prompt="The ginseng character angrily points at coffee cup, steam shoots from head, makes heart beating gesture on chest, then calms and makes wait gesture. Sound effects only, no music no voice.",
            narration="나 홍삼이야! 커피랑 같이 먹으면 심장이 쿵쿵! 반나절 띄워서 먹어!",
            subtitle="나 홍삼이야!",
            duration=6
        ),
        Segment(
            id=7,
            character_name="마무리",
            # 차별화: 박사 알약 대신 스마트한 캡슐 로봇
            image_prompt=f"{base_style}, friendly capsule robot character half red half white with digital screen face showing happy emoji, wearing tiny graduation cap, giving double thumbs up, standing in bright modern classroom with whiteboard showing vitamin icons, sparkle effects, {base_quality}",
            motion_prompt="The capsule robot waves hello cheerfully, gives enthusiastic thumbs up, sparkles animate around. Uplifting camera movement. Sound effects only, no music no voice.",
            narration="영양제는 타이밍이 생명! 똑똑하게 먹자!",
            subtitle="똑똑하게 먹자!",
            duration=6
        ),
    ]


class RunwareImageGenerator:
    """Generate images using Runware API."""

    BASE_URL = "https://api.runware.ai/v1"

    def __init__(self):
        self.api_key = RUNWARE_API_KEY

    async def generate(self, prompt: str, output_path: Path) -> Optional[Path]:
        async with aiohttp.ClientSession(headers={
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }) as session:

            payload = [{
                "taskType": "imageInference",
                "taskUUID": str(uuid.uuid4()),
                "positivePrompt": prompt,
                "negativePrompt": "realistic photo, ugly, blurry, text, watermark, nsfw, dark, scary",
                "width": 768,
                "height": 1344,
                "model": "runware:100@1",
                "numberResults": 1,
                "outputFormat": "PNG",
                "steps": 28,
                "CFGScale": 7.5,
            }]

            async with session.post(f"{self.BASE_URL}/images", json=payload, timeout=aiohttp.ClientTimeout(total=120)) as resp:
                if resp.status != 200:
                    logger.error(f"Image generation failed: {await resp.text()}")
                    return None

                result = await resp.json()
                data = result.get("data", result)

                if isinstance(data, list) and len(data) > 0:
                    image_url = data[0].get("imageURL") or data[0].get("imageUrl")
                    if image_url:
                        async with session.get(image_url) as img_resp:
                            if img_resp.status == 200:
                                output_path.parent.mkdir(parents=True, exist_ok=True)
                                with open(output_path, "wb") as f:
                                    f.write(await img_resp.read())
                                logger.info(f"Image saved: {output_path}")
                                return output_path
                return None


class WaveSpeedVideoGenerator:
    """Generate videos using WaveSpeed Grok Imagine Video API."""

    BASE_URL = "https://api.wavespeed.ai/api/v3"

    def __init__(self):
        self.api_key = WAVESPEED_API_KEY

    async def generate(self, image_path: Path, motion_prompt: str, duration: int, output_path: Path) -> Optional[Path]:
        """Generate video from image using WaveSpeed Grok."""

        # Read image and convert to base64 data URL
        with open(image_path, "rb") as f:
            image_base64 = base64.b64encode(f.read()).decode("utf-8")

        image_data_url = f"data:image/png;base64,{image_base64}"

        async with aiohttp.ClientSession(headers={
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }) as session:

            payload = {
                "image": image_data_url,
                "prompt": motion_prompt,
                "duration": duration,
                "resolution": "720p"
            }

            # Submit request to correct endpoint
            async with session.post(
                f"{self.BASE_URL}/x-ai/grok-imagine-video/image-to-video",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    logger.error(f"WaveSpeed submit failed: {resp.status} - {error}")
                    return None

                result = await resp.json()
                request_id = result.get("data", {}).get("id") or result.get("id")

                if not request_id:
                    logger.error(f"No request ID: {result}")
                    return None

                logger.info(f"Video generation started: {request_id}")

            # Poll for result
            for attempt in range(120):  # Max 10 minutes
                await asyncio.sleep(5)

                async with session.get(
                    f"{self.BASE_URL}/predictions/{request_id}/result",
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as poll_resp:
                    if poll_resp.status != 200:
                        continue

                    poll_result = await poll_resp.json()

                    # Handle data being list or dict
                    data = poll_result.get("data", {})
                    if isinstance(data, list) and len(data) > 0:
                        data = data[0]
                    if not isinstance(data, dict):
                        data = {}

                    status = data.get("status") or poll_result.get("status")

                    if status == "completed":
                        # Try different response formats for video URL
                        video_url = None

                        # outputs can be a list of URLs
                        outputs = data.get("outputs")
                        if isinstance(outputs, list) and len(outputs) > 0:
                            video_url = outputs[0]
                        elif isinstance(outputs, dict):
                            video_url = outputs.get("video")

                        # Fallback to other fields
                        if not video_url:
                            video_url = data.get("video") or data.get("output") or poll_result.get("video")

                        if video_url:
                            async with session.get(video_url) as vid_resp:
                                if vid_resp.status == 200:
                                    output_path.parent.mkdir(parents=True, exist_ok=True)
                                    with open(output_path, "wb") as f:
                                        f.write(await vid_resp.read())
                                    logger.info(f"Video saved: {output_path}")
                                    return output_path

                        logger.error(f"No video URL in result: {poll_result}")
                        return None

                    elif status == "failed":
                        error = data.get("error", "Unknown")
                        logger.error(f"Video generation failed: {error}")
                        return None

                    else:
                        if attempt % 6 == 0:  # Log every 30 seconds
                            logger.info(f"Status: {status} ({attempt * 5}s)")

            logger.error("Video generation timed out")
            return None


class ElevenLabsAudioGenerator:
    """Generate audio using ElevenLabs."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self):
        self.api_key = ELEVENLABS_API_KEY
        self.voice_id = ELEVENLABS_VOICE_ID

    async def generate(self, text: str, output_path: Path) -> Optional[Path]:
        async with aiohttp.ClientSession(headers={
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }) as session:

            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.3,
                    "similarity_boost": 0.85,
                    "style": 0.6,
                }
            }

            async with session.post(
                f"{self.BASE_URL}/text-to-speech/{self.voice_id}",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    logger.error(f"Audio generation failed: {await resp.text()}")
                    return None

                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "wb") as f:
                    f.write(await resp.read())
                logger.info(f"Audio saved: {output_path}")
                return output_path


async def run_pipeline(generate_videos: bool = False):
    """
    Run pipeline.

    Args:
        generate_videos: If True, also generate videos with WaveSpeed (costs money)
    """

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / f"reel_{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Output: {output_dir}")

    segments = create_health_tip_segments()
    logger.info(f"Segments: {len(segments)}")

    # === STEP 1: Generate Images ===
    logger.info("=" * 50)
    logger.info("STEP 1: 이미지 생성")
    logger.info("=" * 50)

    image_gen = RunwareImageGenerator()
    images = {}

    for seg in segments:
        img_path = output_dir / f"{seg.id:02d}_{seg.character_name}.png"
        result = await image_gen.generate(seg.image_prompt, img_path)
        if result:
            images[seg.id] = result
        await asyncio.sleep(1)

    logger.info(f"이미지 완료: {len(images)}/{len(segments)}")

    # === STEP 2: Generate Videos (Optional) ===
    videos = {}
    if generate_videos and images:
        logger.info("=" * 50)
        logger.info("STEP 2: 비디오 생성 (WaveSpeed Grok)")
        logger.info("=" * 50)

        video_gen = WaveSpeedVideoGenerator()

        for seg in segments:
            if seg.id not in images:
                continue

            vid_path = output_dir / f"{seg.id:02d}_{seg.character_name}.mp4"
            result = await video_gen.generate(
                image_path=images[seg.id],
                motion_prompt=seg.motion_prompt,
                duration=seg.duration,
                output_path=vid_path
            )
            if result:
                videos[seg.id] = result

        logger.info(f"비디오 완료: {len(videos)}/{len(segments)}")

    # === STEP 3: Generate Audio ===
    logger.info("=" * 50)
    logger.info("STEP 3: 음성 생성")
    logger.info("=" * 50)

    audio_gen = ElevenLabsAudioGenerator()
    audios = {}

    for seg in segments:
        audio_path = output_dir / f"{seg.id:02d}_{seg.character_name}.mp3"
        result = await audio_gen.generate(seg.narration, audio_path)
        if result:
            audios[seg.id] = result
        await asyncio.sleep(0.5)

    logger.info(f"음성 완료: {len(audios)}/{len(segments)}")

    # === Summary ===
    logger.info("=" * 50)
    logger.info("완료!")
    logger.info("=" * 50)
    logger.info(f"결과: {output_dir}")
    logger.info(f"  이미지: {len(images)}개")
    logger.info(f"  비디오: {len(videos)}개")
    logger.info(f"  음성: {len(audios)}개")

    return output_dir


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--with-video", action="store_true", help="Also generate videos (costs money)")
    args = parser.parse_args()

    asyncio.run(run_pipeline(generate_videos=args.with_video))
