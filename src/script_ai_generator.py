"""
AI-powered script generator using Claude API.
Generates health tip scripts automatically from a topic.
"""
import asyncio
import aiohttp
import json
from pathlib import Path
from typing import Optional
import logging

from models import Script, Segment, Shot, Character, ShotType, Emotion
from config import CLAUDE_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


SCRIPT_GENERATION_PROMPT = '''당신은 건강 정보 릴스 영상 스크립트 작성 전문가입니다.
주어진 주제로 Instagram 릴스용 스크립트를 JSON 형식으로 작성해주세요.

규칙:
1. 각 영양제/건강팁을 의인화된 3D 캐릭터로 표현
2. 캐릭터가 직접 시청자에게 말하는 형식 ("나 ○○야!")
3. 문제점 제시 → 이유 설명 → 해결책 순서
4. 짧고 임팩트 있는 문장 사용
5. 감정 표현이 풍부한 연출 (화남, 당황, 걱정 등)
6. 각 세그먼트는 5-8초, 총 60초 이내

JSON 구조:
{
  "title": "영상 제목",
  "outro_text": "마무리 멘트",
  "segments": [
    {
      "id": 1,
      "character": {
        "name": "캐릭터 이름",
        "shape": "3D 형태 (예: red pill capsule, yellow vitamin tablet)",
        "color": "색상 설명",
        "description": "캐릭터 설명"
      },
      "background": "배경 설명 (예: kitchen, bedroom, office)",
      "props": ["소품1", "소품2"],
      "audio_text": "이 세그먼트의 전체 나레이션 텍스트",
      "shots": [
        {
          "type": "medium|closeup",
          "emotion": "happy|angry|shocked|worried|serious|satisfied|explaining|warning|annoyed",
          "gesture": "제스처 설명",
          "subtitle": "화면에 표시될 짧은 자막",
          "duration": 1.2
        }
      ]
    }
  ]
}

주제: {topic}

위 형식대로 JSON만 출력하세요.'''


class ClaudeScriptGenerator:
    """Generate scripts using Claude API."""

    BASE_URL = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str = CLAUDE_API_KEY):
        self.api_key = api_key
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def generate_script_json(self, topic: str) -> Optional[dict]:
        """Generate script JSON from topic using Claude."""

        if not self.session:
            raise RuntimeError("Session not initialized.")

        payload = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "user",
                    "content": SCRIPT_GENERATION_PROMPT.format(topic=topic)
                }
            ]
        }

        try:
            async with self.session.post(
                f"{self.BASE_URL}/messages",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Claude API error: {response.status} - {error_text}")
                    return None

                result = await response.json()
                content = result.get("content", [])

                if content and len(content) > 0:
                    text = content[0].get("text", "")

                    # Extract JSON from response
                    try:
                        # Find JSON in response
                        start = text.find("{")
                        end = text.rfind("}") + 1
                        if start >= 0 and end > start:
                            json_str = text[start:end]
                            return json.loads(json_str)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON: {e}")

                return None

        except Exception as e:
            logger.error(f"Error generating script: {e}")
            return None

    async def generate_script(self, topic: str) -> Optional[Script]:
        """Generate Script object from topic."""

        json_data = await self.generate_script_json(topic)

        if not json_data:
            return None

        try:
            return parse_script_json(json_data)
        except Exception as e:
            logger.error(f"Error parsing script: {e}")
            return None


def parse_script_json(data: dict) -> Script:
    """Parse JSON data into Script object."""

    segments = []

    for seg_data in data.get("segments", []):
        char_data = seg_data.get("character", {})
        character = Character(
            name=char_data.get("name", "캐릭터"),
            shape=char_data.get("shape", "pill"),
            color=char_data.get("color", "colorful"),
            description=char_data.get("description", "")
        )

        shots = []
        for shot_data in seg_data.get("shots", []):
            shot_type = ShotType(shot_data.get("type", "medium"))

            emotion_str = shot_data.get("emotion", "neutral")
            try:
                emotion = Emotion(emotion_str)
            except ValueError:
                emotion = Emotion.NEUTRAL

            shot = Shot(
                shot_type=shot_type,
                emotion=emotion,
                gesture=shot_data.get("gesture", "standing"),
                subtitle=shot_data.get("subtitle", ""),
                duration=float(shot_data.get("duration", 1.0))
            )
            shots.append(shot)

        segment = Segment(
            id=seg_data.get("id", len(segments) + 1),
            character=character,
            background=seg_data.get("background", "simple background"),
            props=seg_data.get("props", []),
            shots=shots,
            audio_text=seg_data.get("audio_text", "")
        )
        segments.append(segment)

    return Script(
        title=data.get("title", "건강 팁"),
        segments=segments,
        outro_text=data.get("outro_text", "")
    )


async def generate_script_from_topic(topic: str, output_path: Optional[Path] = None) -> Optional[Script]:
    """Generate script from topic and optionally save to file."""

    async with ClaudeScriptGenerator() as generator:
        script = await generator.generate_script(topic)

        if script and output_path:
            from script_generator import script_to_json
            script_to_json(script, output_path)
            logger.info(f"Script saved to {output_path}")

        return script


if __name__ == "__main__":
    async def test():
        topic = "비타민C를 잘못 먹는 방법 3가지"

        async with ClaudeScriptGenerator() as generator:
            json_data = await generator.generate_script_json(topic)

            if json_data:
                print("Generated Script JSON:")
                print(json.dumps(json_data, ensure_ascii=False, indent=2))

    asyncio.run(test())
