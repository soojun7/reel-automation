#!/usr/bin/env python3
"""
Grok All-in-One Pipeline - Image → Grok Video (음성+영상 동시 생성)
가장 단순하고 빠른 파이프라인
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

from config import RUNWARE_API_KEY, WAVESPEED_API_KEY, OUTPUT_DIR
import uuid

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class Segment:
    """One segment with voice style and scene direction."""
    id: int
    character_name: str
    image_prompt: str
    video_prompt: str  # 음성 스타일 + 대사 + 장면 연출 통합
    subtitle: str


def create_health_tip_segments() -> List[Segment]:
    """Create segments with detailed voice style and scene direction."""

    base_style = "3D cartoon animation style, cute chibi character, facing camera, clear face visible"
    base_quality = "soft studio lighting, pastel colors, clean minimal background, vertical 9:16"

    return [
        Segment(
            id=1,
            character_name="루테인",
            image_prompt=f"{base_style}, adorable ruby red gemstone character with small arms and legs, grumpy pouty expression with puffed cheeks, standing on modern white marble table, steaming bowl of korean bibimbap nearby, {base_quality}",
            video_prompt="""Character speaks with cute angry high-pitched female voice in Korean:
"나 루테인이야! 빈속에 날 먹으면 하나도 흡수 안 되고 다 빠져나가! 꼭 밥 먹고 먹어!"

Voice style: Adorable but frustrated, like a tiny angry child scolding someone. High energy, expressive tone with emphasis on key words.

Scene direction: Character points angrily at the food bowl, stamps feet, shakes head side to side rapidly, arms waving expressively. Camera slowly zooms in on face during the scolding.""",
            subtitle="나 루테인이야!",
        ),
        Segment(
            id=2,
            character_name="비타민D",
            image_prompt=f"{base_style}, cute little sun character with orange glow wearing tiny nightcap, frustrated sleepy expression, sitting on cozy beige sofa bed, nighttime city lights through large window, moon visible outside, {base_quality}",
            video_prompt="""Character speaks with sleepy but annoyed female voice in Korean:
"나 비타민D야! 자기 전에 먹으면 뇌가 낮인 줄 알고 잠이 안 와! 아침에 먹어!"

Voice style: Drowsy and yawning at first, then suddenly alert and frustrated. Cute whiny tone like being woken up from a nap.

Scene direction: Character yawns big, then suddenly gets angry and alert, points at the moon outside window, waves arms in frustration. Subtle camera shake when character gets angry.""",
            subtitle="나 비타민D야!",
        ),
        Segment(
            id=3,
            character_name="비타민A",
            image_prompt=f"{base_style}, worried orange carrot character with green leaf hair, panicked expression, standing in modern bathroom with mirror and skincare products, {base_quality}",
            video_prompt="""Character speaks with worried anxious female voice in Korean:
"나 비타민A야! 고용량 오래 먹으면 간에 쌓여서 탈모 올 수 있어! 적정량만!"

Voice style: Nervous and panicky at first, then calming down to give advice. Cute worried tone with slight trembling.

Scene direction: Character nervously touches leaf hair, some leaves fall down, looks at mirror with big worried eyes, then calms down and nods wisely. Camera focuses on falling hair then face.""",
            subtitle="나 비타민A야!",
        ),
        Segment(
            id=4,
            character_name="종합비타민",
            image_prompt=f"{base_style}, round rainbow lollipop candy character with colorful swirls, shocked disgusted expression, standing on picnic blanket in park, spilled matcha latte making green puddle, {base_quality}",
            video_prompt="""Character speaks with shocked disgusted female voice in Korean:
"나 종합비타민이야! 녹차랑 먹으면 탄닌이 영양소 다 뺏어가! 물로 먹어!"

Voice style: Dramatic gasp at first, then disgusted and offended tone. Like seeing something gross. Cute but very expressive.

Scene direction: Character jumps back in shock from the green tea puddle, makes exaggerated disgusted face, waves hands saying no no no. Camera shakes slightly with the jump.""",
            subtitle="나 종합비타민이야!",
        ),
        Segment(
            id=5,
            character_name="아연",
            image_prompt=f"{base_style}, shiny platinum Zn letter character with metallic texture, sick nauseous expression holding tummy, standing on empty white ceramic plate on minimalist kitchen counter, {base_quality}",
            video_prompt="""Character speaks with queasy sick female voice in Korean:
"나 아연이야! 빈속에 먹으면 위가 뒤집어져! 밥 먹고 먹어!"

Voice style: Nauseous and uncomfortable at first, groaning sounds, then recovering to give advice cheerfully. Cute sick voice.

Scene direction: Character wobbles unsteadily, holds stomach, face turns slightly green, makes queasy expression, then recovers and gives thumbs up with a weak smile. Camera tilts with wobbling.""",
            subtitle="나 아연이야!",
        ),
        Segment(
            id=6,
            character_name="홍삼",
            image_prompt=f"{base_style}, cute ginseng root character with reddish brown color and root legs, angry furious expression with steam puffs from head, standing on wooden home office desk, iced coffee drink nearby, laptop in background, {base_quality}",
            video_prompt="""Character speaks with angry heated female voice in Korean:
"나 홍삼이야! 커피랑 같이 먹으면 심장이 쿵쿵! 반나절 띄워서 먹어!"

Voice style: Hot-tempered and fuming, steam-whistle angry. Heartbeat sounds emphasized. Then calming down to give advice.

Scene direction: Character angrily points at coffee cup, steam shoots from head, makes heart-pounding gesture on chest, then takes deep breath and makes "wait" hand gesture. Camera vibrates with heartbeat.""",
            subtitle="나 홍삼이야!",
        ),
        Segment(
            id=7,
            character_name="마무리",
            image_prompt=f"{base_style}, friendly capsule robot character half red half white with digital screen face showing happy emoji, wearing tiny graduation cap, giving double thumbs up, standing in bright modern classroom with whiteboard showing vitamin icons, sparkle effects, {base_quality}",
            video_prompt="""Character speaks with cheerful energetic female voice in Korean:
"영양제는 타이밍이 생명! 똑똑하게 먹자!"

Voice style: Bright, encouraging teacher voice. Enthusiastic and uplifting. Celebratory tone with sparkle sound effects.

Scene direction: Character waves hello cheerfully, gives enthusiastic double thumbs up, sparkles animate around. Happy bouncing motion. Uplifting camera movement with slight zoom out to show full scene.""",
            subtitle="똑똑하게 먹자!",
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
                "negativePrompt": "realistic photo, ugly, blurry, text, watermark, nsfw, dark, scary, side view, back view",
                "width": 768,
                "height": 1376,
                "model": "google:4@3",
                "numberResults": 1,
                "outputFormat": "PNG",
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


class GrokVideoGenerator:
    """Generate video with voice using WaveSpeed Grok."""

    BASE_URL = "https://api.wavespeed.ai/api/v3"

    def __init__(self):
        self.api_key = WAVESPEED_API_KEY

    async def generate(self, image_path: Path, video_prompt: str, output_path: Path) -> Optional[Path]:
        """Generate video with voice from image and detailed prompt."""

        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode()

        async with aiohttp.ClientSession() as session:
            payload = {
                "image": f"data:image/png;base64,{image_b64}",
                "prompt": video_prompt,
                "duration": 6,
                "resolution": "720p"
            }

            # Submit request
            async with session.post(
                f"{self.BASE_URL}/x-ai/grok-imagine-video/image-to-video",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status != 200:
                    logger.error(f"Grok submit failed: {await resp.text()}")
                    return None

                result = await resp.json()
                request_id = result.get("data", {}).get("id")
                if not request_id:
                    logger.error(f"No request ID: {result}")
                    return None

                logger.info(f"Video generation started: {request_id}")

            # Poll for completion
            for attempt in range(60):
                await asyncio.sleep(5)

                async with session.get(
                    f"{self.BASE_URL}/predictions/{request_id}/result",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as poll_resp:
                    if poll_resp.status != 200:
                        continue

                    poll_result = await poll_resp.json()
                    data = poll_result.get("data", {})
                    status = data.get("status")

                    if status == "completed":
                        outputs = data.get("outputs", [])
                        if outputs:
                            video_url = outputs[0]
                            async with session.get(video_url) as vid_resp:
                                if vid_resp.status == 200:
                                    output_path.parent.mkdir(parents=True, exist_ok=True)
                                    with open(output_path, "wb") as f:
                                        f.write(await vid_resp.read())
                                    logger.info(f"Video saved: {output_path}")
                                    return output_path
                        logger.error(f"No video URL: {poll_result}")
                        return None

                    elif status == "failed":
                        logger.error(f"Video failed: {data.get('error')}")
                        return None

                    if attempt % 6 == 0:
                        logger.info(f"Status: {status} ({attempt * 5}s)")

            logger.error("Video generation timed out")
            return None


async def run_pipeline():
    """Run the Grok all-in-one pipeline with parallel generation."""

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / f"grok_{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Output: {output_dir}")
    logger.info("Mode: 병렬 생성 (Grok 음성+영상)")

    segments = create_health_tip_segments()
    logger.info(f"Segments: {len(segments)}")

    # === STEP 1: Generate Images (Parallel) ===
    logger.info("=" * 50)
    logger.info("STEP 1: 이미지 생성 (Runware) - 병렬")
    logger.info("=" * 50)

    image_gen = RunwareImageGenerator()

    async def gen_image(seg):
        img_path = output_dir / f"{seg.id:02d}_{seg.character_name}.png"
        result = await image_gen.generate(seg.image_prompt, img_path)
        return (seg.id, result) if result else (seg.id, None)

    image_results = await asyncio.gather(*[gen_image(seg) for seg in segments])
    images = {seg_id: path for seg_id, path in image_results if path}

    logger.info(f"이미지 완료: {len(images)}/{len(segments)}")

    # === STEP 2: Generate Videos with Voice (Parallel) ===
    logger.info("=" * 50)
    logger.info("STEP 2: 비디오+음성 생성 (Grok) - 병렬")
    logger.info("=" * 50)

    video_gen = GrokVideoGenerator()

    async def gen_video(seg):
        if seg.id not in images:
            logger.warning(f"Skipping segment {seg.id}: missing image")
            return (seg.id, None)

        vid_path = output_dir / f"{seg.id:02d}_{seg.character_name}.mp4"
        result = await video_gen.generate(
            image_path=images[seg.id],
            video_prompt=seg.video_prompt,
            output_path=vid_path
        )
        return (seg.id, result) if result else (seg.id, None)

    # 모든 비디오 동시 생성
    video_results = await asyncio.gather(*[gen_video(seg) for seg in segments])
    videos = {seg_id: path for seg_id, path in video_results if path}

    logger.info(f"비디오 완료: {len(videos)}/{len(segments)}")

    # === Summary ===
    logger.info("=" * 50)
    logger.info("완료!")
    logger.info("=" * 50)
    logger.info(f"결과: {output_dir}")
    logger.info(f"  이미지: {len(images)}개")
    logger.info(f"  비디오: {len(videos)}개")

    return output_dir


if __name__ == "__main__":
    asyncio.run(run_pipeline())
