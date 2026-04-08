#!/usr/bin/env python3
"""
Hedra Lip Sync Pipeline - All-in-one: Image → Hedra TTS → Hedra Lip Sync Video
"""
import asyncio
import logging
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import List, Optional

import aiohttp
import sys
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from config import RUNWARE_API_KEY, HEDRA_API_KEY, OUTPUT_DIR
import uuid

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Hedra voice for cute character
HEDRA_VOICE_ID = "0674e225-4dcf-470e-8f9f-465d9c3919ec"  # Kawaii Aerisita
# Hedra Character 3 model for lip sync
HEDRA_MODEL_ID = "d1dd37a3-e39a-4854-a298-6510289f9cf2"


@dataclass
class Segment:
    """One segment = one character scene with lip sync."""
    id: int
    character_name: str
    image_prompt: str
    motion_prompt: str
    narration: str
    subtitle: str


def create_health_tip_segments() -> List[Segment]:
    """Create segments with character designs and motion prompts."""

    base_style = "3D cartoon animation style, cute chibi character, facing camera, clear face visible"
    base_quality = "soft studio lighting, pastel colors, clean minimal background, vertical 9:16"

    return [
        Segment(
            id=1,
            character_name="루테인",
            image_prompt=f"{base_style}, adorable ruby red gemstone character with small arms and legs, grumpy pouty expression with puffed cheeks, standing on modern white marble table, steaming bowl of korean bibimbap nearby, {base_quality}",
            motion_prompt="Character talking angrily pointing at the food, head shaking side to side, expressive hand gestures",
            narration="나 루테인이야! 빈속에 날 먹으면 하나도 흡수 안 되고 다 빠져나가! 꼭 밥 먹고 먹어!",
            subtitle="나 루테인이야!",
        ),
        Segment(
            id=2,
            character_name="비타민D",
            image_prompt=f"{base_style}, cute little sun character with orange glow wearing tiny nightcap, frustrated sleepy expression, sitting on cozy beige sofa bed, nighttime city lights through large window, moon visible outside, {base_quality}",
            motion_prompt="Character yawning then getting angry, waving arms in frustration, pointing at the moon outside",
            narration="나 비타민D야! 자기 전에 먹으면 뇌가 낮인 줄 알고 잠이 안 와! 아침에 먹어!",
            subtitle="나 비타민D야!",
        ),
        Segment(
            id=3,
            character_name="비타민A",
            image_prompt=f"{base_style}, worried orange carrot character with green leaf hair, panicked expression, standing in modern bathroom with mirror and skincare products, {base_quality}",
            motion_prompt="Character nervously touching hair, worried expression, looking at mirror concerned, then calming down",
            narration="나 비타민A야! 고용량 오래 먹으면 간에 쌓여서 탈모 올 수 있어! 적정량만!",
            subtitle="나 비타민A야!",
        ),
        Segment(
            id=4,
            character_name="종합비타민",
            image_prompt=f"{base_style}, round rainbow lollipop candy character with colorful swirls, shocked disgusted expression, standing on picnic blanket in park, spilled matcha latte making green puddle, {base_quality}",
            motion_prompt="Character jumping back in shock from spilled tea, making disgusted face, waving hands",
            narration="나 종합비타민이야! 녹차랑 먹으면 탄닌이 영양소 다 뺏어가! 물로 먹어!",
            subtitle="나 종합비타민이야!",
        ),
        Segment(
            id=5,
            character_name="아연",
            image_prompt=f"{base_style}, shiny platinum Zn letter character with metallic texture, sick nauseous expression holding tummy, standing on empty white ceramic plate on minimalist kitchen counter, {base_quality}",
            motion_prompt="Character wobbling feeling sick, holding stomach, making queasy face, then recovering",
            narration="나 아연이야! 빈속에 먹으면 위가 뒤집어져! 밥 먹고 먹어!",
            subtitle="나 아연이야!",
        ),
        Segment(
            id=6,
            character_name="홍삼",
            image_prompt=f"{base_style}, cute ginseng root character with reddish brown color and root legs, angry furious expression with steam puffs from head, standing on wooden home office desk, iced coffee drink nearby, laptop in background, {base_quality}",
            motion_prompt="Character angrily pointing at coffee cup, steam shooting from head, making heart beating gesture",
            narration="나 홍삼이야! 커피랑 같이 먹으면 심장이 쿵쿵! 반나절 띄워서 먹어!",
            subtitle="나 홍삼이야!",
        ),
        Segment(
            id=7,
            character_name="마무리",
            image_prompt=f"{base_style}, friendly capsule robot character half red half white with digital screen face showing happy emoji, wearing tiny graduation cap, giving double thumbs up, standing in bright modern classroom with whiteboard showing vitamin icons, sparkle effects, {base_quality}",
            motion_prompt="Character waving hello cheerfully, giving enthusiastic thumbs up, happy celebratory expression",
            narration="영양제는 타이밍이 생명! 똑똑하게 먹자!",
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


class HedraGenerator:
    """Generate TTS audio and lip-synced videos using Hedra API."""

    BASE_URL = "https://api.hedra.com/web-app/public"

    def __init__(self):
        self.api_key = HEDRA_API_KEY

    async def _upload_image(self, session: aiohttp.ClientSession, file_path: Path) -> Optional[str]:
        """Upload image and return asset ID."""
        headers = {"x-api-key": self.api_key}

        # Create asset placeholder
        async with session.post(
            f"{self.BASE_URL}/assets",
            json={"name": file_path.name, "type": "image"},
            headers={**headers, "Content-Type": "application/json"}
        ) as resp:
            if resp.status not in [200, 201]:
                logger.error(f"Asset creation failed: {await resp.text()}")
                return None
            result = await resp.json()
            asset_id = result.get("id")

        # Upload file
        with open(file_path, "rb") as f:
            form_data = aiohttp.FormData()
            form_data.add_field('file', f, filename=file_path.name)

            async with session.post(
                f"{self.BASE_URL}/assets/{asset_id}/upload",
                data=form_data,
                headers=headers
            ) as resp:
                if resp.status not in [200, 201]:
                    logger.error(f"Image upload failed: {await resp.text()}")
                    return None

        logger.info(f"Uploaded image: {file_path.name} -> {asset_id}")
        return asset_id

    async def generate_tts(self, session: aiohttp.ClientSession, text: str, voice_id: str = HEDRA_VOICE_ID) -> Optional[str]:
        """Generate TTS audio and return asset_id (not file, just ID for video generation)."""
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}

        payload = {
            "type": "text_to_speech",
            "voice_id": voice_id,
            "text": text
        }

        async with session.post(f"{self.BASE_URL}/generations", json=payload, headers=headers) as resp:
            if resp.status not in [200, 201]:
                logger.error(f"TTS request failed: {await resp.text()}")
                return None

            result = await resp.json()
            gen_id = result.get("id")
            asset_id = result.get("asset_id")
            logger.info(f"TTS started: {gen_id}")

        # Poll for completion
        for attempt in range(60):
            await asyncio.sleep(2)
            async with session.get(
                f"{self.BASE_URL}/generations/{gen_id}/status",
                headers={"x-api-key": self.api_key}
            ) as poll_resp:
                if poll_resp.status != 200:
                    continue
                status_result = await poll_resp.json()
                status = status_result.get("status")

                if status in ["complete", "completed"]:
                    final_asset_id = status_result.get("asset_id") or asset_id
                    logger.info(f"TTS complete: {final_asset_id}")
                    return final_asset_id
                elif status == "failed":
                    logger.error(f"TTS failed: {status_result}")
                    return None

        logger.error("TTS timed out")
        return None

    async def generate_video(
        self,
        session: aiohttp.ClientSession,
        image_id: str,
        audio_id: str,
        motion_prompt: str,
        output_path: Path
    ) -> Optional[Path]:
        """Generate lip-synced video using image and audio asset IDs."""
        headers = {"x-api-key": self.api_key, "Content-Type": "application/json"}

        payload = {
            "type": "video",
            "ai_model_id": HEDRA_MODEL_ID,
            "start_keyframe_id": image_id,
            "audio_id": audio_id,
            "generated_video_inputs": {
                "text_prompt": motion_prompt,
                "resolution": "720p",
                "aspect_ratio": "9:16"
            }
        }

        async with session.post(
            f"{self.BASE_URL}/generations",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=60)
        ) as resp:
            if resp.status not in [200, 201]:
                logger.error(f"Video generation failed: {await resp.text()}")
                return None

            result = await resp.json()
            gen_id = result.get("id")
            logger.info(f"Video generation started: {gen_id}")

        # Poll for completion
        for attempt in range(120):
            await asyncio.sleep(5)
            async with session.get(
                f"{self.BASE_URL}/generations/{gen_id}/status",
                headers={"x-api-key": self.api_key}
            ) as poll_resp:
                if poll_resp.status != 200:
                    continue

                status_result = await poll_resp.json()
                status = status_result.get("status")

                if status in ["complete", "completed"]:
                    video_url = status_result.get("url") or status_result.get("download_url")
                    if not video_url:
                        logger.error(f"No video URL: {status_result}")
                        return None

                    logger.info("Downloading video...")
                    async with session.get(video_url) as vid_resp:
                        if vid_resp.status == 200:
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            with open(output_path, "wb") as f:
                                f.write(await vid_resp.read())
                            logger.info(f"Video saved: {output_path}")
                            return output_path
                    return None

                elif status == "failed":
                    logger.error(f"Video failed: {status_result}")
                    return None

                if attempt % 6 == 0:
                    logger.info(f"Status: {status} ({attempt * 5}s)")

        logger.error("Video generation timed out")
        return None

    async def create_lipsync_video(
        self,
        image_path: Path,
        narration_text: str,
        motion_prompt: str,
        output_path: Path
    ) -> Optional[Path]:
        """Full pipeline: Upload image → Generate TTS → Generate lip-sync video."""
        async with aiohttp.ClientSession() as session:
            # Step 1: Upload image
            image_id = await self._upload_image(session, image_path)
            if not image_id:
                return None

            # Step 2: Generate TTS audio
            audio_id = await self.generate_tts(session, narration_text)
            if not audio_id:
                return None

            # Step 3: Generate lip-sync video
            return await self.generate_video(session, image_id, audio_id, motion_prompt, output_path)


async def run_pipeline(parallel: bool = True):
    """Run the all-in-one Hedra lip sync pipeline.

    Args:
        parallel: If True, generate all videos concurrently (faster but uses more API quota)
    """

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / f"hedra_{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Output: {output_dir}")
    logger.info(f"Mode: {'병렬 생성' if parallel else '순차 생성'}")

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

    # === STEP 2: Generate Lip Sync Videos (Hedra TTS + Character 3) ===
    logger.info("=" * 50)
    logger.info(f"STEP 2: 립싱크 비디오 생성 (Hedra) - {'병렬' if parallel else '순차'}")
    logger.info("=" * 50)

    hedra_gen = HedraGenerator()

    async def gen_video(seg):
        if seg.id not in images:
            logger.warning(f"Skipping segment {seg.id}: missing image")
            return (seg.id, None)

        vid_path = output_dir / f"{seg.id:02d}_{seg.character_name}.mp4"
        result = await hedra_gen.create_lipsync_video(
            image_path=images[seg.id],
            narration_text=seg.narration,
            motion_prompt=seg.motion_prompt,
            output_path=vid_path
        )
        return (seg.id, result) if result else (seg.id, None)

    if parallel:
        # 모든 비디오 동시 생성
        video_results = await asyncio.gather(*[gen_video(seg) for seg in segments])
    else:
        # 순차 생성
        video_results = []
        for seg in segments:
            video_results.append(await gen_video(seg))

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
