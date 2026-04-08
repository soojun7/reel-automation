"""
Video composer - Combines video clips, audio, and subtitles using FFmpeg.
"""
import asyncio
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple
import logging
import json
import tempfile

from models import Segment, Shot, Script
from config import (
    OUTPUT_DIR,
    TEMP_DIR,
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    VIDEO_FPS,
    SUBTITLE_FONT,
    SUBTITLE_FONT_SIZE,
    SUBTITLE_COLOR,
    SUBTITLE_BORDER_COLOR,
    SUBTITLE_BORDER_WIDTH,
    SUBTITLE_Y_POSITION,
    WATERMARK_TEXT,
    WATERMARK_Y_POSITION
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoComposer:
    """Compose final video from clips, audio, and subtitles."""

    def __init__(self, temp_dir: Path = TEMP_DIR, output_dir: Path = OUTPUT_DIR):
        self.temp_dir = Path(temp_dir)
        self.output_dir = Path(output_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def get_video_duration(self, video_path: Path) -> float:
        """Get duration of video file."""
        try:
            result = subprocess.run(
                [
                    "ffprobe", "-v", "quiet",
                    "-show_entries", "format=duration",
                    "-of", "csv=p=0",
                    str(video_path)
                ],
                capture_output=True,
                text=True
            )
            return float(result.stdout.strip())
        except Exception as e:
            logger.error(f"Error getting video duration: {e}")
            return 0.0

    def get_audio_duration(self, audio_path: Path) -> float:
        """Get duration of audio file."""
        return self.get_video_duration(audio_path)  # Same ffprobe command works

    async def concatenate_videos(
        self,
        video_paths: List[Path],
        output_path: Path
    ) -> Optional[Path]:
        """Concatenate multiple video clips into one."""

        if not video_paths:
            logger.error("No video paths provided")
            return None

        # Create concat file
        concat_file = self.temp_dir / "concat_list.txt"
        with open(concat_file, "w") as f:
            for video_path in video_paths:
                f.write(f"file '{video_path.absolute()}'\n")

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path)
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0 and output_path.exists():
                logger.info(f"Concatenated video saved to {output_path}")
                return output_path
            else:
                logger.error(f"FFmpeg concat error: {stderr.decode()}")
                return None

        except Exception as e:
            logger.error(f"Error concatenating videos: {e}")
            return None

    async def add_audio_to_video(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Path
    ) -> Optional[Path]:
        """Add audio track to video."""

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path)
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0 and output_path.exists():
                logger.info(f"Added audio to video: {output_path}")
                return output_path
            else:
                logger.error(f"FFmpeg audio error: {stderr.decode()}")
                return None

        except Exception as e:
            logger.error(f"Error adding audio: {e}")
            return None

    def generate_subtitle_filter(
        self,
        subtitles: List[Tuple[float, float, str]],
        include_watermark: bool = True
    ) -> str:
        """
        Generate FFmpeg drawtext filter for subtitles.

        Args:
            subtitles: List of (start_time, end_time, text) tuples
        """
        filters = []

        for start, end, text in subtitles:
            # Escape special characters for FFmpeg
            escaped_text = text.replace("'", "'\\''").replace(":", "\\:")

            filter_str = (
                f"drawtext=text='{escaped_text}':"
                f"fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:"
                f"fontsize={SUBTITLE_FONT_SIZE}:"
                f"fontcolor={SUBTITLE_COLOR}:"
                f"borderw={SUBTITLE_BORDER_WIDTH}:"
                f"bordercolor={SUBTITLE_BORDER_COLOR}:"
                f"x=(w-text_w)/2:"
                f"y=h*{SUBTITLE_Y_POSITION}:"
                f"enable='between(t,{start},{end})'"
            )
            filters.append(filter_str)

        # Add watermark
        if include_watermark:
            watermark_filter = (
                f"drawtext=text='{WATERMARK_TEXT}':"
                f"fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:"
                f"fontsize=40:"
                f"fontcolor=white@0.8:"
                f"x=(w-text_w)/2:"
                f"y=h*{WATERMARK_Y_POSITION}"
            )
            filters.append(watermark_filter)

        return ",".join(filters)

    async def add_subtitles_to_video(
        self,
        video_path: Path,
        subtitles: List[Tuple[float, float, str]],
        output_path: Path,
        include_watermark: bool = True
    ) -> Optional[Path]:
        """Add burned-in subtitles to video and scale to 1080x1920."""

        subtitle_filter = self.generate_subtitle_filter(subtitles, include_watermark)

        # Scale to 1080x1920 + add subtitles
        if subtitle_filter:
            filter_str = f"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,{subtitle_filter}"
        else:
            filter_str = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"

        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vf", filter_str,
            "-c:a", "copy",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            str(output_path)
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0 and output_path.exists():
                logger.info(f"Added subtitles to video: {output_path}")
                return output_path
            else:
                logger.error(f"FFmpeg subtitle error: {stderr.decode()}")
                return None

        except Exception as e:
            logger.error(f"Error adding subtitles: {e}")
            return None

    def generate_subtitles_from_segments(
        self,
        segments: List[Segment]
    ) -> List[Tuple[float, float, str]]:
        """Generate subtitle timing from segment shots."""

        subtitles = []
        current_time = 0.0

        for segment in segments:
            for shot in segment.shots:
                if shot.subtitle:
                    start_time = current_time
                    end_time = current_time + shot.duration
                    subtitles.append((start_time, end_time, shot.subtitle))
                current_time += shot.duration

        return subtitles

    async def create_segment_video(
        self,
        segment: Segment,
        shot_videos: List[Path],
        audio_path: Optional[Path],
        output_path: Path
    ) -> Optional[Path]:
        """Create complete video for a single segment."""

        # Step 1: Concatenate shot videos
        concat_output = self.temp_dir / f"seg{segment.id:02d}_concat.mp4"
        concat_result = await self.concatenate_videos(shot_videos, concat_output)

        if not concat_result:
            return None

        # Step 2: Add audio if available
        if audio_path and audio_path.exists():
            audio_output = self.temp_dir / f"seg{segment.id:02d}_with_audio.mp4"
            audio_result = await self.add_audio_to_video(
                concat_result, audio_path, audio_output
            )
            if audio_result:
                concat_result = audio_result

        # Step 3: Generate and add subtitles
        subtitles = []
        current_time = 0.0
        for shot in segment.shots:
            if shot.subtitle:
                subtitles.append((current_time, current_time + shot.duration, shot.subtitle))
            current_time += shot.duration

        if subtitles:
            final_result = await self.add_subtitles_to_video(
                concat_result, subtitles, output_path, include_watermark=True
            )
            return final_result

        # If no subtitles, just copy
        import shutil
        shutil.copy(concat_result, output_path)
        return output_path

    async def compose_final_video(
        self,
        script: Script,
        segment_videos: dict,  # {segment_id: [video_paths]}
        segment_audio: dict,   # {segment_id: audio_path}
        output_filename: str = "final_reel.mp4"
    ) -> Optional[Path]:
        """Compose the final video from all segments."""

        segment_final_videos = []

        for segment in script.segments:
            if segment.id not in segment_videos:
                logger.warning(f"No videos for segment {segment.id}")
                continue

            shot_videos = segment_videos[segment.id]
            audio_path = segment_audio.get(segment.id)

            seg_output = self.temp_dir / f"segment_{segment.id:02d}_final.mp4"

            result = await self.create_segment_video(
                segment=segment,
                shot_videos=shot_videos,
                audio_path=audio_path,
                output_path=seg_output
            )

            if result:
                segment_final_videos.append(result)

        if not segment_final_videos:
            logger.error("No segment videos to combine")
            return None

        # Concatenate all segment videos
        final_output = self.output_dir / output_filename
        return await self.concatenate_videos(segment_final_videos, final_output)

    async def compose_with_full_audio(
        self,
        script: Script,
        all_shot_videos: List[Path],  # All shot videos in order
        full_audio_path: Path,
        output_filename: str = "final_reel.mp4"
    ) -> Optional[Path]:
        """
        Alternative composition: Use full narration audio instead of per-segment.
        This provides better audio continuity.
        """

        # Step 1: Concatenate all shot videos
        concat_output = self.temp_dir / "all_shots_concat.mp4"
        concat_result = await self.concatenate_videos(all_shot_videos, concat_output)

        if not concat_result:
            return None

        # Step 2: Add full audio
        audio_output = self.temp_dir / "with_full_audio.mp4"
        audio_result = await self.add_audio_to_video(
            concat_result, full_audio_path, audio_output
        )

        if not audio_result:
            audio_result = concat_result

        # Step 3: Add all subtitles
        subtitles = self.generate_subtitles_from_segments(script.segments)

        final_output = self.output_dir / output_filename
        return await self.add_subtitles_to_video(
            audio_result, subtitles, final_output, include_watermark=True
        )


async def test_composer():
    """Test the video composer with sample data."""
    composer = VideoComposer()

    # Test subtitle filter generation
    test_subtitles = [
        (0.0, 2.0, "나 루테인이야!"),
        (2.0, 4.0, "빈속에 날 먹어?"),
        (4.0, 6.0, "똥으로 다 나간다!"),
    ]

    filter_str = composer.generate_subtitle_filter(test_subtitles)
    print("Generated subtitle filter:")
    print(filter_str)


if __name__ == "__main__":
    asyncio.run(test_composer())
