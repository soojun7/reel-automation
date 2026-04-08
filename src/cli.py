#!/usr/bin/env python3
"""
Command-line interface for Reel Automation Pipeline.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import click


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Reel Automation - Instagram 릴스 자동 생성 도구"""
    pass


@cli.command()
@click.option("--output", "-o", type=click.Path(), help="출력 디렉토리")
@click.option("--script", "-s", type=click.Path(exists=True), help="스크립트 JSON 파일")
@click.option("--topic", "-t", type=str, help="AI로 스크립트 생성할 주제")
@click.option("--skip-images", is_flag=True, help="이미지 생성 건너뛰기")
@click.option("--skip-videos", is_flag=True, help="비디오 생성 건너뛰기")
@click.option("--skip-audio", is_flag=True, help="오디오 생성 건너뛰기")
def generate(output, script, topic, skip_images, skip_videos, skip_audio):
    """전체 릴스 영상 생성"""
    from pipeline import ReelPipeline

    async def run():
        pipeline = ReelPipeline(output_dir=Path(output) if output else None)

        result = await pipeline.run(
            script_path=Path(script) if script else None,
            topic=topic,
            skip_images=skip_images,
            skip_videos=skip_videos,
            skip_audio=skip_audio
        )

        if result:
            click.echo(click.style(f"\n✓ 완료! 영상 저장: {result}", fg="green"))
        else:
            click.echo(click.style("\n✗ 실패", fg="red"))
            sys.exit(1)

    asyncio.run(run())


@cli.command()
@click.argument("topic")
@click.option("--output", "-o", type=click.Path(), default="script.json")
def ai_script(topic, output):
    """AI로 스크립트 생성 (Claude 사용)"""
    from script_ai_generator import generate_script_from_topic

    async def run():
        script = await generate_script_from_topic(topic, Path(output))
        if script:
            click.echo(click.style(f"✓ 스크립트 생성 완료: {output}", fg="green"))
            click.echo(f"  제목: {script.title}")
            click.echo(f"  세그먼트: {len(script.segments)}개")
            click.echo(f"  예상 길이: {script.get_total_duration():.1f}초")
        else:
            click.echo(click.style("✗ 스크립트 생성 실패", fg="red"))

    asyncio.run(run())


@cli.command()
@click.option("--output", "-o", type=click.Path(), default="script.json")
def sample_script(output):
    """샘플 스크립트 생성"""
    from script_generator import create_sample_health_tip_script, script_to_json

    script = create_sample_health_tip_script()
    script_to_json(script, Path(output))

    click.echo(click.style(f"✓ 샘플 스크립트 저장: {output}", fg="green"))
    click.echo(f"  제목: {script.title}")
    click.echo(f"  세그먼트: {len(script.segments)}개")


@cli.command()
@click.argument("text")
@click.option("--output", "-o", type=click.Path(), default="test_audio.mp3")
def test_audio(text, output):
    """음성 생성 테스트"""
    from audio_generator import ElevenLabsGenerator

    async def run():
        async with ElevenLabsGenerator() as gen:
            result = await gen.generate_speech(text, Path(output))
            if result:
                click.echo(click.style(f"✓ 오디오 저장: {result}", fg="green"))
            else:
                click.echo(click.style("✗ 오디오 생성 실패", fg="red"))

    asyncio.run(run())


@cli.command()
@click.argument("prompt")
@click.option("--output", "-o", type=click.Path(), default="test_image.png")
def test_image(prompt, output):
    """이미지 생성 테스트"""
    from image_generator import RunwareImageGenerator

    async def run():
        async with RunwareImageGenerator() as gen:
            result = await gen.generate_image(
                prompt=prompt,
                negative_prompt=gen.build_negative_prompt(),
                output_path=Path(output)
            )
            if result:
                click.echo(click.style(f"✓ 이미지 저장: {result}", fg="green"))
            else:
                click.echo(click.style("✗ 이미지 생성 실패", fg="red"))

    asyncio.run(run())


@cli.command()
def list_voices():
    """ElevenLabs 사용 가능한 음성 목록"""
    from audio_generator import ElevenLabsGenerator

    async def run():
        async with ElevenLabsGenerator() as gen:
            voices = await gen.list_voices()
            if voices:
                click.echo("사용 가능한 음성:")
                for v in voices:
                    labels = v.get("labels", {})
                    lang = labels.get("language", "?")
                    click.echo(f"  - {v['name']} ({v['voice_id']}) [{lang}]")
            else:
                click.echo("음성 목록을 가져올 수 없습니다")

    asyncio.run(run())


@cli.command()
def check():
    """설정 및 API 키 확인"""
    import os
    import shutil
    from config import RUNWARE_API_KEY, WAVESPEED_API_KEY, ELEVENLABS_API_KEY, CLAUDE_API_KEY

    click.echo("설정 확인:")
    click.echo("-" * 40)

    # API Keys
    apis = [
        ("RUNWARE_API_KEY (이미지)", RUNWARE_API_KEY),
        ("WAVESPEED_API_KEY (비디오)", WAVESPEED_API_KEY),
        ("ELEVENLABS_API_KEY (음성)", ELEVENLABS_API_KEY),
        ("CLAUDE_API_KEY (스크립트)", CLAUDE_API_KEY),
    ]

    for name, key in apis:
        if key and len(key) > 10:
            click.echo(click.style(f"✓ {name} 설정됨", fg="green"))
        else:
            click.echo(click.style(f"✗ {name} 미설정", fg="red"))

    # FFmpeg
    if shutil.which("ffmpeg"):
        click.echo(click.style("✓ FFmpeg 설치됨", fg="green"))
    else:
        click.echo(click.style("✗ FFmpeg 미설치", fg="red"))


@cli.command()
@click.argument("script_path", type=click.Path(exists=True))
def validate(script_path):
    """스크립트 JSON 검증"""
    from script_generator import load_script_from_json

    try:
        script = load_script_from_json(Path(script_path))
        click.echo(click.style("✓ 유효한 스크립트", fg="green"))
        click.echo(f"  제목: {script.title}")
        click.echo(f"  세그먼트: {len(script.segments)}개")
        click.echo(f"  총 길이: {script.get_total_duration():.1f}초")

        for seg in script.segments:
            click.echo(f"\n  [{seg.id}] {seg.character.name}")
            click.echo(f"      샷: {len(seg.shots)}개, {seg.get_total_duration():.1f}초")

    except Exception as e:
        click.echo(click.style(f"✗ 스크립트 오류: {e}", fg="red"))


if __name__ == "__main__":
    cli()
