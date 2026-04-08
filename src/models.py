"""
Data models for the reel automation pipeline.
"""
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class ShotType(Enum):
    MEDIUM = "medium"
    CLOSEUP = "closeup"
    WIDE = "wide"


class Emotion(Enum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    ANGRY = "angry"
    SHOCKED = "shocked"
    WORRIED = "worried"
    SERIOUS = "serious"
    SATISFIED = "satisfied"
    EXPLAINING = "explaining"
    WARNING = "warning"
    ANNOYED = "annoyed"


@dataclass
class Character:
    name: str
    shape: str
    color: str
    description: str = ""

    def to_prompt_part(self) -> str:
        return f"cute anthropomorphic {self.shape} character, {self.color} color"


@dataclass
class Shot:
    shot_type: ShotType
    emotion: Emotion
    gesture: str
    subtitle: str
    duration: float
    camera_motion: str = "static"

    def get_emotion_prompt(self) -> str:
        emotion_map = {
            Emotion.NEUTRAL: "neutral calm expression",
            Emotion.HAPPY: "happy smiling expression",
            Emotion.ANGRY: "angry furious expression with furrowed brows",
            Emotion.SHOCKED: "shocked surprised expression with wide eyes",
            Emotion.WORRIED: "worried concerned expression",
            Emotion.SERIOUS: "serious determined expression",
            Emotion.SATISFIED: "satisfied content expression with slight smile",
            Emotion.EXPLAINING: "explaining thoughtful expression",
            Emotion.WARNING: "warning cautious expression",
            Emotion.ANNOYED: "annoyed tired expression",
        }
        return emotion_map.get(self.emotion, "neutral expression")

    def get_camera_prompt(self) -> str:
        if self.shot_type == ShotType.CLOSEUP:
            return "extreme closeup on face, dramatic framing"
        elif self.shot_type == ShotType.WIDE:
            return "wide shot showing full environment"
        else:
            return "medium shot, full body visible"


@dataclass
class Segment:
    id: int
    character: Character
    background: str
    props: List[str]
    shots: List[Shot]
    audio_text: str = ""  # Full narration text for this segment

    def get_total_duration(self) -> float:
        return sum(shot.duration for shot in self.shots)


@dataclass
class Script:
    title: str
    segments: List[Segment]
    outro_text: str = ""

    def get_total_duration(self) -> float:
        return sum(seg.get_total_duration() for seg in self.segments)

    def get_full_narration(self) -> str:
        texts = [seg.audio_text for seg in self.segments if seg.audio_text]
        if self.outro_text:
            texts.append(self.outro_text)
        return " ".join(texts)


@dataclass
class GeneratedAsset:
    segment_id: int
    shot_index: int
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    subtitle_text: str = ""
    duration: float = 0.0


@dataclass
class ProcessedSegment:
    segment_id: int
    video_path: str
    audio_path: str
    duration: float
