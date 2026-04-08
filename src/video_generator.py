"""
Video generator using WaveSpeed API for image-to-video generation.
"""
import asyncio
import aiohttp
import base64
from pathlib import Path
from typing import List, Optional
import logging
import time

from models import Segment, Shot, ShotType
from config import (
    WAVESPEED_API_KEY,
    TEMP_DIR,
    VIDEO_FPS,
    WAVESPEED_VIDEO_MODEL
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WaveSpeedVideoGenerator:
    """Generate videos using WaveSpeed API."""

    BASE_URL = "https://api.wavespeed.ai/api/v2"

    def __init__(self, api_key: str = WAVESPEED_API_KEY):
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def build_video_prompt(self, shot: Shot, character_name: str) -> str:
        """Build motion prompt for video generation."""

        emotion_motions = {
            "happy": "cheerful bouncing, eyes sparkling with joy",
            "angry": "aggressive forward lean, intense expression",
            "shocked": "sudden jump back, eyes widening dramatically",
            "worried": "nervous fidgeting, anxious looking around",
            "serious": "confident stance, determined gaze",
            "satisfied": "relaxed posture, content smile",
            "explaining": "expressive hand gestures while speaking",
            "warning": "emphatic head shaking, cautionary finger wag",
            "annoyed": "eye rolling, exasperated sigh",
            "neutral": "subtle breathing, occasional blink"
        }

        emotion_motion = emotion_motions.get(shot.emotion.value, "subtle idle movement")

        prompt = f"""The cute {character_name} character performs {shot.gesture}.
{emotion_motion}. Mouth moves as if speaking with expressive lip sync.
Subtle idle breathing animation. Smooth natural movement.
Camera: {'slow zoom in' if shot.shot_type == ShotType.CLOSEUP else 'static with slight movement'}."""

        return prompt

    async def generate_video_from_image(
        self,
        image_path: Path,
        motion_prompt: str,
        duration: float,
        output_path: Path
    ) -> Optional[Path]:
        """Generate video from image using WaveSpeed image-to-video API."""

        if not self.session:
            raise RuntimeError("Session not initialized.")

        # Read and encode image as base64
        with open(image_path, "rb") as f:
            image_base64 = base64.b64encode(f.read()).decode("utf-8")

        # Determine image format
        suffix = image_path.suffix.lower()
        mime_type = "image/png" if suffix == ".png" else "image/jpeg"
        image_data_url = f"data:{mime_type};base64,{image_base64}"

        payload = {
            "model": WAVESPEED_VIDEO_MODEL,
            "image": image_data_url,
            "prompt": motion_prompt,
            "size": "480p",
            "duration": "5s",  # WaveSpeed typically uses string format
            "seed": -1,  # Random seed
        }

        try:
            # Submit generation request
            async with self.session.post(
                f"{self.BASE_URL}/image-to-video",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"WaveSpeed API error: {response.status} - {error_text}")
                    return None

                result = await response.json()
                logger.debug(f"WaveSpeed submit response: {result}")

                # Get request ID for polling
                request_id = result.get("data", {}).get("id") or result.get("id")

                if not request_id:
                    logger.error(f"No request ID in response: {result}")
                    return None

            # Poll for completion
            video_url = await self._poll_for_completion(request_id)

            if video_url:
                # Download video
                async with self.session.get(video_url) as vid_response:
                    if vid_response.status == 200:
                        video_bytes = await vid_response.read()
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        with open(output_path, "wb") as f:
                            f.write(video_bytes)
                        logger.info(f"Video saved to {output_path}")
                        return output_path

            return None

        except Exception as e:
            logger.error(f"Error generating video: {e}")
            return None

    async def _poll_for_completion(
        self,
        request_id: str,
        max_attempts: int = 60,
        poll_interval: float = 5.0
    ) -> Optional[str]:
        """Poll WaveSpeed API until video is ready."""

        for attempt in range(max_attempts):
            try:
                async with self.session.get(
                    f"{self.BASE_URL}/predictions/{request_id}/result",
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        logger.warning(f"Poll attempt {attempt + 1} failed: {response.status}")
                        await asyncio.sleep(poll_interval)
                        continue

                    result = await response.json()
                    status = result.get("data", {}).get("status") or result.get("status")

                    if status == "completed":
                        video_url = (
                            result.get("data", {}).get("outputs", {}).get("video") or
                            result.get("data", {}).get("video") or
                            result.get("output", {}).get("video")
                        )
                        if video_url:
                            return video_url
                        logger.error(f"No video URL in completed result: {result}")
                        return None

                    elif status == "failed":
                        error = result.get("data", {}).get("error", "Unknown error")
                        logger.error(f"Video generation failed: {error}")
                        return None

                    else:
                        logger.info(f"Status: {status}, attempt {attempt + 1}/{max_attempts}")
                        await asyncio.sleep(poll_interval)

            except Exception as e:
                logger.warning(f"Poll error: {e}")
                await asyncio.sleep(poll_interval)

        logger.error("Polling timed out")
        return None

    async def generate_segment_videos(
        self,
        segment: Segment,
        image_paths: List[Path],
        output_dir: Path
    ) -> List[Path]:
        """Generate videos for all shots in a segment."""

        output_dir.mkdir(parents=True, exist_ok=True)
        generated_videos = []

        for idx, (shot, image_path) in enumerate(zip(segment.shots, image_paths)):
            motion_prompt = self.build_video_prompt(shot, segment.character.name)
            output_path = output_dir / f"seg{segment.id:02d}_shot{idx:02d}.mp4"

            logger.info(f"Generating video for segment {segment.id}, shot {idx}")

            result = await self.generate_video_from_image(
                image_path=image_path,
                motion_prompt=motion_prompt,
                duration=shot.duration,
                output_path=output_path
            )

            if result:
                generated_videos.append(result)
            else:
                # Fallback to static video
                logger.warning(f"Falling back to static video for segment {segment.id}, shot {idx}")
                fallback_path = await self.create_static_video(
                    image_path, shot.duration, output_path
                )
                if fallback_path:
                    generated_videos.append(fallback_path)

            await asyncio.sleep(2.0)  # Rate limiting

        return generated_videos

    async def create_static_video(
        self,
        image_path: Path,
        duration: float,
        output_path: Path
    ) -> Optional[Path]:
        """Fallback: Create static video from image using ffmpeg."""

        try:
            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(image_path),
                "-c:v", "libx264",
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
                "-r", str(VIDEO_FPS),
                str(output_path)
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()

            if output_path.exists():
                logger.info(f"Created static video fallback: {output_path}")
                return output_path

        except Exception as e:
            logger.error(f"Failed to create static video: {e}")

        return None


async def generate_all_videos(
    segments: List[Segment],
    image_paths_dict: dict,
    output_dir: Path
) -> dict:
    """Generate videos for all segments."""

    all_videos = {}

    async with WaveSpeedVideoGenerator() as generator:
        for segment in segments:
            if segment.id not in image_paths_dict:
                logger.warning(f"No images found for segment {segment.id}")
                continue

            seg_output_dir = output_dir / f"segment_{segment.id:02d}"
            videos = await generator.generate_segment_videos(
                segment=segment,
                image_paths=image_paths_dict[segment.id],
                output_dir=seg_output_dir
            )
            all_videos[segment.id] = videos
            logger.info(f"Generated {len(videos)} videos for segment {segment.id}")

    return all_videos


if __name__ == "__main__":
    from script_generator import create_sample_health_tip_script

    async def test():
        script = create_sample_health_tip_script()
        test_segment = script.segments[0]

        async with WaveSpeedVideoGenerator() as generator:
            prompt = generator.build_video_prompt(
                test_segment.shots[0],
                test_segment.character.name
            )
            print("Generated Video Prompt:")
            print(prompt)

    asyncio.run(test())
