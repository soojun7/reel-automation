"""
Image generator using Runware API.
"""
import asyncio
import aiohttp
import base64
from pathlib import Path
from typing import List, Optional
import logging
import uuid

from models import Segment, Shot, ShotType, Character
from config import (
    RUNWARE_API_KEY,
    TEMP_DIR,
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    RUNWARE_IMAGE_MODEL
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RunwareImageGenerator:
    """Generate images using Runware API."""

    BASE_URL = "https://api.runware.ai/v1"

    def __init__(self, api_key: str = RUNWARE_API_KEY):
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

    def build_image_prompt(
        self,
        character: Character,
        shot: Shot,
        background: str,
        props: List[str]
    ) -> str:
        """Build detailed prompt for image generation."""

        # Camera framing
        if shot.shot_type == ShotType.CLOSEUP:
            framing = "extreme closeup portrait, face and upper body"
        elif shot.shot_type == ShotType.WIDE:
            framing = "wide shot, full environment"
        else:
            framing = "medium shot, full body visible"

        props_str = ", ".join(props) if props else ""

        prompt = f"""3D Pixar Disney animation style, {framing},
cute adorable anthropomorphic {character.shape} character,
{character.color}, expressive cartoon face,
{shot.get_emotion_prompt()}, {shot.gesture},
standing in {background}, {props_str},
shallow depth of field, warm cinematic lighting,
hyper detailed, 8K quality, vertical 9:16"""

        return prompt

    def build_negative_prompt(self) -> str:
        return "realistic, photograph, 2D, ugly, blurry, text, watermark, multiple characters, nsfw"

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str,
        output_path: Path,
        width: int = VIDEO_WIDTH,
        height: int = VIDEO_HEIGHT
    ) -> Optional[Path]:
        """Generate single image using Runware API."""

        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")

        task_uuid = str(uuid.uuid4())

        payload = [
            {
                "taskType": "imageInference",
                "taskUUID": task_uuid,
                "positivePrompt": prompt,
                "negativePrompt": negative_prompt,
                "width": width,
                "height": height,
                "model": RUNWARE_IMAGE_MODEL,
                "numberResults": 1,
                "outputFormat": "PNG",
                "steps": 25,
                "CFGScale": 7.0,
            }
        ]

        try:
            async with self.session.post(
                f"{self.BASE_URL}/images",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                response_text = await response.text()
                logger.debug(f"Runware response: {response_text}")

                if response.status != 200:
                    logger.error(f"Runware API error: {response.status} - {response_text}")
                    return None

                result = await response.json()
                logger.debug(f"Runware result: {result}")

                # Handle different response formats
                data = result.get("data", result)
                if isinstance(data, list) and len(data) > 0:
                    image_data = data[0]
                elif isinstance(data, dict):
                    image_data = data
                else:
                    logger.error(f"Unexpected response format: {result}")
                    return None

                # Get image URL or base64
                image_url = image_data.get("imageURL") or image_data.get("imageUrl")

                if image_url:
                    async with self.session.get(image_url) as img_response:
                        if img_response.status == 200:
                            image_bytes = await img_response.read()
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            with open(output_path, "wb") as f:
                                f.write(image_bytes)
                            logger.info(f"Image saved to {output_path}")
                            return output_path

                logger.error("No image URL in response")
                return None

        except Exception as e:
            logger.error(f"Error generating image: {e}")
            return None

    async def generate_segment_images(
        self,
        segment: Segment,
        output_dir: Path
    ) -> List[Path]:
        """Generate all images for a segment."""

        output_dir.mkdir(parents=True, exist_ok=True)
        generated_paths = []

        for idx, shot in enumerate(segment.shots):
            prompt = self.build_image_prompt(
                character=segment.character,
                shot=shot,
                background=segment.background,
                props=segment.props
            )
            negative_prompt = self.build_negative_prompt()

            output_path = output_dir / f"seg{segment.id:02d}_shot{idx:02d}.png"

            logger.info(f"Generating image for segment {segment.id}, shot {idx}")

            result = await self.generate_image(
                prompt=prompt,
                negative_prompt=negative_prompt,
                output_path=output_path
            )

            if result:
                generated_paths.append(result)
            else:
                logger.warning(f"Failed to generate image for segment {segment.id}, shot {idx}")

            await asyncio.sleep(1.0)  # Rate limiting

        return generated_paths


async def generate_all_images(segments: List[Segment], output_dir: Path) -> dict:
    """Generate images for all segments."""

    all_images = {}

    async with RunwareImageGenerator() as generator:
        for segment in segments:
            seg_output_dir = output_dir / f"segment_{segment.id:02d}"
            images = await generator.generate_segment_images(segment, seg_output_dir)
            all_images[segment.id] = images
            logger.info(f"Generated {len(images)} images for segment {segment.id}")

    return all_images


if __name__ == "__main__":
    from script_generator import create_sample_health_tip_script

    async def test():
        script = create_sample_health_tip_script()
        test_segment = script.segments[0]

        async with RunwareImageGenerator() as generator:
            prompt = generator.build_image_prompt(
                character=test_segment.character,
                shot=test_segment.shots[0],
                background=test_segment.background,
                props=test_segment.props
            )
            print("Generated Prompt:")
            print(prompt)

    asyncio.run(test())
