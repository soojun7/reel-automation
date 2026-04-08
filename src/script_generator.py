"""
Script generator - Creates structured scripts for health tip reels.
Can use LLM to generate content or load from JSON.
"""
import json
from typing import List, Optional
from pathlib import Path

from models import Script, Segment, Shot, Character, ShotType, Emotion


def create_sample_health_tip_script() -> Script:
    """
    Creates a sample script based on the analyzed Instagram reel format.
    """
    segments = [
        # Segment 1: Lutein
        Segment(
            id=1,
            character=Character(
                name="루테인",
                shape="glossy red kidney bean pill",
                color="dark red translucent glossy",
                description="지용성 영양제"
            ),
            background="cozy korean kitchen interior, wooden dining table, pendant lamp, window with curtains, warm afternoon lighting",
            props=["bowl of steaming white rice", "ceramic spoon", "wooden chopsticks"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.ANNOYED, "hands on hips", "나 루테인이야!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.SHOCKED, "both hands raised in disbelief", "빈속에 날 먹어?", 1.2),
                Shot(ShotType.MEDIUM, Emotion.EXPLAINING, "arms spread wide gesturing", "나 완전 기름 덩어리라", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.SERIOUS, "pointing finger up", "공복에 삼키면", 1.0),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "finger wagging side to side", "똥으로 다 나간다고!", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.SERIOUS, "pointing at rice bowl", "밥 먹고 바로 먹자!", 1.2),
            ],
            audio_text="나 루테인이야! 빈속에 날 먹어? 나 완전 기름 덩어리라. 공복에 삼키면 하나도 안 스며들고 똥으로 다 나간다고! 꼭 밥 먹고 바로 먹자!"
        ),

        # Segment 2: Vitamin D
        Segment(
            id=2,
            character=Character(
                name="비타민D",
                shape="yellow transparent gel capsule pill",
                color="golden yellow translucent glowing",
                description="햇빛 비타민"
            ),
            background="modern bedroom at night, city view through window, blue ambient lighting, messy bed with books",
            props=["blue sleep cap", "glowing brain hologram above head", "smartphone on bed"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.ANNOYED, "wearing sleep cap, arms crossed", "나 비타민D!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.SHOCKED, "hands on head in frustration", "자기 전에 날 먹으면?", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.ANGRY, "pointing finger at viewer", "뇌가 낮이라고 착각해!", 1.2),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "making X with arms", "수면 호르몬 스위치 꺼져!", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.SERIOUS, "thumbs up gesture", "아침이나 낮에 먹자!", 1.2),
            ],
            audio_text="나 비타민D! 자기 전에 날 먹으면? 뇌가 지금이 낮이라고 착각해서 수면 호르몬 스위치가 꺼져! 불면증 직행이야. 무조건 아침이나 낮 식후에 먹자!"
        ),

        # Segment 3: Vitamin A
        Segment(
            id=3,
            character=Character(
                name="비타민A",
                shape="oval yellow supplement capsule",
                color="bright yellow opaque",
                description="간에 축적되는 비타민"
            ),
            background="pharmacy shelf background with many vitamin bottles, wooden shelves, warm lighting",
            props=["falling hair strands", "liver icon", "warning sign"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.SERIOUS, "standing confidently", "나 비타민A!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "hands pulling hair in panic", "고용량 장기복용하면?", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.WORRIED, "hands on head, hair falling", "간에 차곡차곡 쌓여!", 1.2),
                Shot(ShotType.MEDIUM, Emotion.ANGRY, "pointing at self dramatically", "탈모까지 올 수 있어!", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.SERIOUS, "calm explaining gesture", "적정량만 먹자!", 1.0),
            ],
            audio_text="나 비타민A! 고용량으로 장기복용하면? 비타민B나 C랑 달라. 간에 차곡차곡 축적돼서 과도하게 쌓이면 독이 되고 탈모까지 올 수 있어! 적정량만 조심해서 먹자!"
        ),

        # Segment 4: Multivitamin
        Segment(
            id=4,
            character=Character(
                name="종합비타민",
                shape="white egg-shaped pill with colorful dots",
                color="white with red blue yellow green speckles",
                description="철분, 칼슘, 아연 포함"
            ),
            background="bright cafe interior, wooden table, people in background blurred, natural daylight",
            props=["green tea cup spilled", "tea leaves on table", "ceramic teacup"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.HAPPY, "waving hello", "나 종합비타민이야!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.SHOCKED, "stepping back from spilled tea", "녹차랑 같이 먹어?", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.ANGRY, "arms crossed angrily", "탄닌이 영양소 다 뺏어가!", 1.2),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "pointing at tea dramatically", "철분 칼슘 아연 다 똥으로!", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.SATISFIED, "holding glass of water", "맹물로 먹자!", 1.0),
            ],
            audio_text="나 종합비타민이야! 녹차랑 같이 먹어? 녹차에 탄닌 성분이 철분, 칼슘, 아연 전부 똥으로 나가버려! 비타민은 맹물로 먹자!"
        ),

        # Segment 5: Zinc
        Segment(
            id=5,
            character=Character(
                name="아연",
                shape="round metallic silver ball pill",
                color="shiny chrome silver metallic",
                description="위장에 자극적인 영양소"
            ),
            background="modern dining room, dark wood table, pendant lights, evening ambiance",
            props=["empty white plate", "crumpled tissues", "glass of water"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.SERIOUS, "standing on empty plate", "나 아연이야!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.ANGRY, "fists clenched showing strength", "빈속에 날 삼키면?", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.ANGRY, "grabbing stomach area", "위 점막을 긁어버려!", 1.2),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "making nauseous face", "메스꺼움 폭발!", 1.0),
                Shot(ShotType.CLOSEUP, Emotion.SATISFIED, "thumbs up confidently", "밥 먹고 먹어!", 1.0),
            ],
            audio_text="나 아연이야! 빈속에 날 삼키면? 위 점막을 무자비하게 긁어대! 위경련과 메스꺼움 폭발! 반드시 밥 든든히 먹은 식후에 먹자!"
        ),

        # Segment 6: Red Ginseng
        Segment(
            id=6,
            character=Character(
                name="홍삼",
                shape="red ginseng stick pouch package",
                color="bright red with golden accents",
                description="카페인과 상극"
            ),
            background="office desk with computer monitor, keyboard, documents, corporate environment",
            props=["iced americano in plastic cup", "steam coming from head", "coffee beans"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.SERIOUS, "standing next to coffee cup", "나 홍삼이야!", 1.0),
                Shot(ShotType.MEDIUM, Emotion.ANGRY, "pointing at coffee angrily, steam from head", "커피랑 같이 먹어?", 1.2),
                Shot(ShotType.CLOSEUP, Emotion.ANGRY, "red face, steam shooting out", "심장이 폭주해!", 1.2),
                Shot(ShotType.MEDIUM, Emotion.WARNING, "making heart pounding gesture", "밤새 쿵쿵거려!", 1.0),
                Shot(ShotType.CLOSEUP, Emotion.SATISFIED, "calm, making time gesture", "반나절 띄워서 먹자!", 1.2),
            ],
            audio_text="나 홍삼이야! 커피랑 같이 먹어? 카페인이랑 겹치면 혈압 치솟고 밤새 심장이 쿵쿵 뛰어! 이 둘은 반나절 띄워서 먹자!"
        ),

        # Outro segment
        Segment(
            id=7,
            character=Character(
                name="종합비타민",
                shape="white egg-shaped pill with colorful dots wearing glasses",
                color="white with colorful speckles, wearing round black glasses",
                description="마무리 캐릭터"
            ),
            background="bright classroom or study room, chalkboard behind, warm lighting, sparkles and stars effect",
            props=["magic wand with sparkles", "floating vitamin icons", "chalkboard with health tips"],
            shots=[
                Shot(ShotType.MEDIUM, Emotion.HAPPY, "wearing glasses, waving with sparkles", "영양제 똑똑하게", 1.0),
                Shot(ShotType.CLOSEUP, Emotion.SATISFIED, "thumbs up with big smile, sparkles around", "먹자!", 1.0),
            ],
            audio_text="영양제는 흡수율과 타이밍이 생명! 유용했다면 팔로우 하고 건강 챙기자!"
        ),
    ]

    return Script(
        title="영양제 잘못 먹으면 다 똥으로 나간다",
        segments=segments,
        outro_text="영양제는 흡수율과 타이밍이 생명! 유용했다면 팔로우 하고 건강 챙기자!"
    )


def script_to_json(script: Script, output_path: Path) -> None:
    """Export script to JSON file."""
    data = {
        "title": script.title,
        "outro_text": script.outro_text,
        "total_duration": script.get_total_duration(),
        "segments": []
    }

    for seg in script.segments:
        seg_data = {
            "id": seg.id,
            "character": {
                "name": seg.character.name,
                "shape": seg.character.shape,
                "color": seg.character.color,
                "description": seg.character.description
            },
            "background": seg.background,
            "props": seg.props,
            "audio_text": seg.audio_text,
            "duration": seg.get_total_duration(),
            "shots": []
        }

        for shot in seg.shots:
            shot_data = {
                "type": shot.shot_type.value,
                "emotion": shot.emotion.value,
                "gesture": shot.gesture,
                "subtitle": shot.subtitle,
                "duration": shot.duration,
                "camera_motion": shot.camera_motion
            }
            seg_data["shots"].append(shot_data)

        data["segments"].append(seg_data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_script_from_json(json_path: Path) -> Script:
    """Load script from JSON file."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    segments = []
    for seg_data in data["segments"]:
        character = Character(
            name=seg_data["character"]["name"],
            shape=seg_data["character"]["shape"],
            color=seg_data["character"]["color"],
            description=seg_data["character"].get("description", "")
        )

        shots = []
        for shot_data in seg_data["shots"]:
            shot = Shot(
                shot_type=ShotType(shot_data["type"]),
                emotion=Emotion(shot_data["emotion"]),
                gesture=shot_data["gesture"],
                subtitle=shot_data["subtitle"],
                duration=shot_data["duration"],
                camera_motion=shot_data.get("camera_motion", "static")
            )
            shots.append(shot)

        segment = Segment(
            id=seg_data["id"],
            character=character,
            background=seg_data["background"],
            props=seg_data["props"],
            shots=shots,
            audio_text=seg_data.get("audio_text", "")
        )
        segments.append(segment)

    return Script(
        title=data["title"],
        segments=segments,
        outro_text=data.get("outro_text", "")
    )


if __name__ == "__main__":
    # Test script generation
    script = create_sample_health_tip_script()
    print(f"Title: {script.title}")
    print(f"Total duration: {script.get_total_duration():.1f}s")
    print(f"Number of segments: {len(script.segments)}")

    for seg in script.segments:
        print(f"\n  Segment {seg.id}: {seg.character.name}")
        print(f"    Duration: {seg.get_total_duration():.1f}s")
        print(f"    Shots: {len(seg.shots)}")
