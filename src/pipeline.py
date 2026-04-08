"""
Main pipeline orchestrator for automated reel generation.
"""
import asyncio
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from models import Script
from config import OUTPUT_DIR, TEMP_DIR
from script_generator import create_sample_health_tip_script, script_to_json, load_script_from_json
from image_generator import RunwareImageGenerator, generate_all_images
from video_generator import WaveSpeedVideoGenerator, generate_all_videos
from audio_generator import ElevenLabsGenerator, generate_all_audio
from composer import VideoComposer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ReelPipeline:
    """
    Main pipeline for automated Instagram reel generation.

    Steps:
    1. Generate/Load script (Claude AI or JSON file)
    2. Generate images (Runware API)
    3. Generate videos (WaveSpeed API)
    4. Generate audio (ElevenLabs API)
    5. Compose final video (FFmpeg)
    """

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        temp_dir: Optional[Path] = None
    ):
        self.output_dir = Path(output_dir) if output_dir else OUTPUT_DIR
        self.temp_dir = Path(temp_dir) if temp_dir else TEMP_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        self.run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.run_dir = self.output_dir / f"run_{self.run_id}"
        self.run_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Pipeline initialized. Run ID: {self.run_id}")
        logger.info(f"Output: {self.run_dir}")

    async def step_1_prepare_script(
        self,
        script_path: Optional[Path] = None,
        topic: Optional[str] = None
    ) -> Script:
        """Step 1: Prepare the script."""

        logger.info("=" * 50)
        logger.info("STEP 1: 스크립트 준비")
        logger.info("=" * 50)

        if script_path and script_path.exists():
            logger.info(f"JSON 파일에서 로드: {script_path}")
            script = load_script_from_json(script_path)

        elif topic:
            logger.info(f"Claude AI로 생성: {topic}")
            from script_ai_generator import generate_script_from_topic
            script = await generate_script_from_topic(topic)
            if not script:
                logger.warning("AI 생성 실패, 샘플 스크립트 사용")
                script = create_sample_health_tip_script()

        else:
            logger.info("샘플 스크립트 사용")
            script = create_sample_health_tip_script()

        script_output = self.run_dir / "script.json"
        script_to_json(script, script_output)
        logger.info(f"스크립트 저장: {script_output}")
        logger.info(f"제목: {script.title}")
        logger.info(f"세그먼트: {len(script.segments)}개")
        logger.info(f"예상 길이: {script.get_total_duration():.1f}초")

        return script

    async def step_2_generate_images(self, script: Script) -> dict:
        """Step 2: Generate images."""

        logger.info("=" * 50)
        logger.info("STEP 2: 이미지 생성 (Runware)")
        logger.info("=" * 50)

        images_dir = self.run_dir / "images"
        total_shots = sum(len(seg.shots) for seg in script.segments)
        logger.info(f"총 {total_shots}개 이미지 생성 중...")

        image_paths = await generate_all_images(script.segments, images_dir)

        total_generated = sum(len(paths) for paths in image_paths.values())
        logger.info(f"완료: {total_generated}/{total_shots}개")

        return image_paths

    async def step_3_generate_videos(self, script: Script, image_paths: dict) -> dict:
        """Step 3: Generate videos."""

        logger.info("=" * 50)
        logger.info("STEP 3: 비디오 생성 (WaveSpeed)")
        logger.info("=" * 50)

        videos_dir = self.run_dir / "videos"
        video_paths = await generate_all_videos(script.segments, image_paths, videos_dir)

        total_generated = sum(len(paths) for paths in video_paths.values())
        logger.info(f"완료: {total_generated}개 클립")

        return video_paths

    async def step_4_generate_audio(self, script: Script) -> dict:
        """Step 4: Generate audio."""

        logger.info("=" * 50)
        logger.info("STEP 4: 음성 생성 (ElevenLabs)")
        logger.info("=" * 50)

        audio_dir = self.run_dir / "audio"
        audio_paths = await generate_all_audio(script.segments, audio_dir)

        logger.info(f"완료: {len(audio_paths)}개 세그먼트")

        # Full narration
        async with ElevenLabsGenerator() as generator:
            full_audio = audio_dir / "full_narration.mp3"
            await generator.generate_full_narration(script, full_audio)

        return audio_paths

    async def step_5_compose_video(
        self,
        script: Script,
        video_paths: dict,
        audio_paths: dict
    ) -> Optional[Path]:
        """Step 5: Compose final video."""

        logger.info("=" * 50)
        logger.info("STEP 5: 최종 영상 합성 (FFmpeg)")
        logger.info("=" * 50)

        composer = VideoComposer(temp_dir=self.temp_dir, output_dir=self.run_dir)

        final_video = await composer.compose_final_video(
            script=script,
            segment_videos=video_paths,
            segment_audio=audio_paths,
            output_filename="final_reel.mp4"
        )

        if final_video and final_video.exists():
            logger.info(f"최종 영상: {final_video}")
            return final_video

        logger.error("영상 합성 실패")
        return None

    async def run(
        self,
        script_path: Optional[Path] = None,
        topic: Optional[str] = None,
        skip_images: bool = False,
        skip_videos: bool = False,
        skip_audio: bool = False
    ) -> Optional[Path]:
        """Run the complete pipeline."""

        logger.info("=" * 60)
        logger.info("REEL AUTOMATION PIPELINE 시작")
        logger.info("=" * 60)

        try:
            # Step 1
            script = await self.step_1_prepare_script(script_path, topic)

            # Step 2
            if not skip_images:
                image_paths = await self.step_2_generate_images(script)
            else:
                logger.info("이미지 생성 건너뛰기")
                image_paths = self._load_existing("images", script, "*.png")

            if not image_paths or all(len(v) == 0 for v in image_paths.values()):
                logger.error("이미지가 없습니다")
                return None

            # Step 3
            if not skip_videos:
                video_paths = await self.step_3_generate_videos(script, image_paths)
            else:
                logger.info("비디오 생성 건너뛰기")
                video_paths = self._load_existing("videos", script, "*.mp4")

            if not video_paths or all(len(v) == 0 for v in video_paths.values()):
                logger.error("비디오가 없습니다")
                return None

            # Step 4
            if not skip_audio:
                audio_paths = await self.step_4_generate_audio(script)
            else:
                logger.info("오디오 생성 건너뛰기")
                audio_paths = self._load_existing_audio(script)

            # Step 5
            final_video = await self.step_5_compose_video(script, video_paths, audio_paths)

            logger.info("=" * 60)
            if final_video:
                logger.info("파이프라인 완료!")
                logger.info(f"결과: {final_video}")
            else:
                logger.error("파이프라인 실패")
            logger.info("=" * 60)

            return final_video

        except Exception as e:
            logger.error(f"에러: {e}", exc_info=True)
            return None

    def _load_existing(self, folder: str, script: Script, pattern: str) -> dict:
        """Load existing files."""
        assets = {}
        base_dir = self.run_dir / folder

        for segment in script.segments:
            seg_dir = base_dir / f"segment_{segment.id:02d}"
            if seg_dir.exists():
                assets[segment.id] = sorted(seg_dir.glob(pattern))

        return assets

    def _load_existing_audio(self, script: Script) -> dict:
        """Load existing audio."""
        audio = {}
        audio_dir = self.run_dir / "audio"

        for segment in script.segments:
            audio_file = audio_dir / f"seg{segment.id:02d}_audio.mp3"
            if audio_file.exists():
                audio[segment.id] = audio_file

        return audio


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Reel Automation Pipeline")
    parser.add_argument("--script", "-s", type=Path)
    parser.add_argument("--topic", "-t", type=str)
    parser.add_argument("--output", "-o", type=Path)
    parser.add_argument("--skip-images", action="store_true")
    parser.add_argument("--skip-videos", action="store_true")
    parser.add_argument("--skip-audio", action="store_true")

    args = parser.parse_args()

    pipeline = ReelPipeline(output_dir=args.output)
    result = await pipeline.run(
        script_path=args.script,
        topic=args.topic,
        skip_images=args.skip_images,
        skip_videos=args.skip_videos,
        skip_audio=args.skip_audio
    )

    if result:
        print(f"\n완료! 영상: {result}")
    else:
        print("\n실패")


if __name__ == "__main__":
    asyncio.run(main())
