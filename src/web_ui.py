#!/usr/bin/env python3
"""
Reel Automation - Multi-Step Workflow UI
대본 → 이미지 (개별 재생성) → 확정 → 영상
"""
import streamlit as st
import asyncio
from pathlib import Path
from datetime import datetime
from typing import List, Optional
import base64
import aiohttp
import uuid
import sys
import json
import os

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from config import RUNWARE_API_KEY, WAVESPEED_API_KEY, OUTPUT_DIR
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")

st.set_page_config(page_title="Reel Studio", page_icon="🎬", layout="wide", initial_sidebar_state="collapsed")

# Pure CSS (no Tailwind)
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

.stApp {
    background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%) !important;
}

#MainMenu, footer, .stDeployButton, header { display: none !important; }

/* Text area */
.stTextArea textarea {
    background: rgba(20, 20, 35, 0.9) !important;
    border: 1px solid rgba(139, 92, 246, 0.3) !important;
    border-radius: 16px !important;
    color: #e2e8f0 !important;
    font-size: 15px !important;
    padding: 16px !important;
}
.stTextArea textarea:focus {
    border-color: #8b5cf6 !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
}

/* Primary Button */
.stButton > button {
    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%) !important;
    border: none !important;
    border-radius: 12px !important;
    color: white !important;
    font-weight: 600 !important;
    padding: 12px 24px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4) !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5) !important;
}

/* Progress bar */
.stProgress > div > div {
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%) !important;
    border-radius: 10px;
}

/* Spinner */
.stSpinner > div { border-color: #8b5cf6 transparent transparent transparent !important; }

/* Images */
div[data-testid="stImage"] img { border-radius: 12px; }

/* Video */
video { border-radius: 12px; }
</style>
""", unsafe_allow_html=True)

# === API Functions ===
async def analyze_script_with_claude(script_text: str) -> List[dict]:
    prompt = f"""다음 대본을 분석해서 각 세그먼트로 나눠줘. JSON 배열만 반환해.

대본:
{script_text}

형식:
[{{"character_name": "이름", "dialogue": "대사", "voice_style": "목소리 스타일", "scene_direction": "장면 연출", "character_appearance": "캐릭터 외형", "background_scene": "배경 장면", "brand_domain": "브랜드 도메인(선택)"}}]

중요 규칙:
- brand_domain: 만약 캐릭터가 특정 브랜드, 기업, 앱, 서비스 로고를 의인화한 것이라면 해당 브랜드의 공식 영문 도메인 주소를 적어줘 (예: 구글이면 google.com, 유튜브면 youtube.com, 넷플릭스면 netflix.com 등). 특정 브랜드가 아니면 빈 문자열("")로 남겨둬.
- background_scene: 포토리얼리스틱한 실제 환경!
  - 실제 주방, 식탁, 침실, 카페 등 현실적인 공간
  - 얕은 피사계 심도 (배경 블러 효과)
  - 따뜻한 자연광 또는 실내 조명
  - 김, 물방울, 먼지 입자 등 분위기 요소
  - 관련 소품 배치 (음식 옆에는 접시, 숟가락 등)
  - 예: "실제 주방 가스레인지 위, 김이 모락모락, 주변에 재료들"
  - 예: "나무 식탁 위, 따뜻한 아침 햇살, 커피잔과 토스트"
- character_appearance: 실제 사물의 재질과 질감을 100% 유지한 의인화!

  **스타일 규칙 (매우 중요!):**
  - 실제 사물의 재질/질감/색상을 그대로 유지
  - 얼굴은 사물 표면에 직접 표현 (큰 눈, 이빨 보이는 입)
  - 팔다리는 같은 재질로 작게 추가
  - 표정은 극도로 과장 (화남, 놀람, 짜증 등 이빨 드러내며)
  - 포토리얼리스틱 CG 스타일 (픽사/디즈니 퀄리티)

  [영양제/보충제 - 실제 제품 질감]
  - 루테인: 투명한 주황색 소프트젤 캡슐, 광택있는 젤리 질감, 내부에 오일 보임
  - 비타민D: 노란색 플라스틱 영양제통, 실제 제품처럼, 뚜껑이 모자
  - 비타민A: 주황색 반투명 캡슐, 젤라틴 질감
  - 아연: 은색 금속 질감의 원형 정제, 반짝이는 메탈릭
  - 홍삼: 실제 빨간 인삼 뿌리, 자연스러운 뿌리 질감
  - 오메가3: 황금색 투명 피쉬오일 캡슐, 기름 광택
  - 철분: 어두운 빨간색 정제, 매트한 질감

  [음식/재료 - 실제 음식 질감]
  - 블루베리: 진짜 블루베리 과일 질감, 표면의 하얀 분, 초록 꼭지
  - 꿀: 투명 유리병 안의 황금색 꿀, 끈적한 질감
  - 냄비: 스테인리스 스틸 금속 냄비, 반사광
  - 커피: 커피잔 또는 커피콩, 갈색 톤

  [IT/테크 브랜드 - 실제 로고 의인화]
  - 구글/Google: 빨강,노랑,초록,파랑 4색 "G" 로고, 광택있는 플라스틱 질감
  - 유튜브/YouTube: 빨간 재생버튼, 광택있는 빨간 플라스틱
  - 챗GPT/ChatGPT: 초록색 꽃 모양 로고, 네온 글로우 효과
  - 클로드/Claude: 주황색/베이지 원형, 부드러운 질감
- background_scene: 구체적인 배경 묘사 (예: "흰색 대리석 테이블 위, 김이 나는 비빔밥 옆에 서있음")
- 대사 내용과 연관된 배경 설정 (예: 빈속 얘기하면 음식 근처, 잠 얘기하면 침실)

목소리 (voice_style) - 매우 중요! 각 캐릭터마다 완전히 다른 목소리로:
- 구체적인 음색: 높은/낮은, 굵은/가는, 허스키/맑은
- 감정 톤: 화난/졸린/걱정되는/신난/메스꺼운/뜨거운
- 말투 특징: 빠르게/느리게, 또박또박/웅얼웅얼
- 비유 표현: "잠에서 깬 아이처럼", "선생님처럼 훈계하듯", "아픈 사람처럼 신음하며"
- 예시: "높은 톤의 짜증난 목소리, 화난 꼬마가 혼내듯이, 빠르고 날카롭게"
- 예시: "낮고 나른한 목소리, 하품 섞인 졸린 톤, 느릿느릿하게"
- 예시: "떨리는 걱정스러운 목소리, 겁먹은 듯 작게, 불안하게"

scene_direction: 오버액션으로 과장된 동작
- 예시: "발을 동동 구르며, 양팔을 휘저으며, 고개를 세차게 흔들며"
- 예시: "크게 하품하며, 눈을 비비며, 베개를 껴안으며"
- 예시: "배를 움켜쥐고 휘청거리며, 얼굴이 초록색으로 변하며"
"""

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514", "max_tokens": 4096, "messages": [{"role": "user", "content": prompt}]}
        ) as resp:
            if resp.status != 200: return []
            result = await resp.json()
            content = result.get("content", [{}])[0].get("text", "")
            try:
                import re
                match = re.search(r'\[[\s\S]*\]', content)
                if match: return json.loads(match.group())
            except: pass
            return []

def convert_to_prompts(segments: List[dict]) -> List[dict]:
    result = []
    for seg in segments:
        name = seg.get("character_name", "캐릭터")
        dialogue = seg.get("dialogue", "")
        voice = seg.get("voice_style", "귀엽고 밝은 목소리")
        scene = seg.get("scene_direction", "표정을 바꾸며 말함")
        char_appearance = seg.get("character_appearance", f"cute {name} character")
        background = seg.get("background_scene", "clean minimal background")
        brand_domain = seg.get("brand_domain", "").strip()

        result.append({
            "character_name": name,
            "dialogue": dialogue,
            "brand_domain": brand_domain,
            "image_prompt": f"Hyper realistic 3D render, {char_appearance}, extremely exaggerated facial expression with big eyes and visible teeth showing emotion, small arms and legs made of same material, {background}, shallow depth of field with blurred background, warm cinematic lighting, photorealistic textures and materials, steam or particles for atmosphere, vertical 9:16 aspect ratio, Pixar Disney quality render",
            "video_prompt": f"""Character speaks in Korean with very expressive animated voice:
"{dialogue}"

Voice style: {voice}. Over-the-top voice acting with exaggerated emotions. Each word should have dramatic emphasis and energy.

Scene direction: {scene}. Exaggerated cartoon-like movements, big facial expressions, dramatic gestures. Camera follows the action with slight movements."""
        })
    return result

async def generate_image(prompt: str, output_path: Path, seed_image_url: Optional[str] = None) -> Optional[tuple]:
    """이미지 생성 후 (로컬 경로, 원격 URL) 튜플 반환"""
    async with aiohttp.ClientSession() as session:
        payload = {
            "taskType": "imageInference",
            "taskUUID": str(uuid.uuid4()),
            "positivePrompt": prompt,
            "negativePrompt": "2D, flat, simple, low quality, blurry, text, watermark, nsfw, anime, sketch, drawing, painting, abstract background, plain background, solid color background",
            "width": 768,
            "height": 1376,
            "model": "google:4@3",
            "numberResults": 1,
            "outputFormat": "PNG"
        }

        # 만약 로고(seed_image)가 있다면 referenceImages로 추가
        if seed_image_url:
            payload["inputs"] = {
                "referenceImages": [seed_image_url]
            }

        async with session.post("https://api.runware.ai/v1/images", json=[payload],
                                headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
                                timeout=aiohttp.ClientTimeout(total=120)) as resp:
            if resp.status != 200: return None
            data = (await resp.json()).get("data", [])
            if data:
                url = data[0].get("imageURL") or data[0].get("imageUrl")
                if url:
                    async with session.get(url) as img:
                        if img.status == 200:
                            output_path.parent.mkdir(parents=True, exist_ok=True)
                            output_path.write_bytes(await img.read())
                            return (output_path, url)  # 경로와 URL 모두 반환
    return None

async def generate_video(image_url: str, prompt: str, output_path: Path) -> Optional[Path]:
    """Runware API로 비디오 생성 (이미지 URL 필요)"""
    task_uuid = str(uuid.uuid4())
    payload = [{
        "taskType": "videoInference",
        "taskUUID": task_uuid,
        "model": "xai:grok-imagine@video",
        "outputFormat": "mp4",
        "height": 1280,
        "width": 720,
        "numberResults": 1,
        "inputs": {"frameImages": [{"image": image_url}]},
        "positivePrompt": prompt,
        "duration": 6,
        "deliveryMethod": "async"
    }]

    async with aiohttp.ClientSession() as session:
        # 1. 비디오 생성 요청
        async with session.post(
            "https://api.runware.ai/v1/videos",
            json=payload,
            headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=60)
        ) as resp:
            if resp.status != 200: return None

        # 2. 결과 폴링 (최대 3분)
        for _ in range(36):
            await asyncio.sleep(5)
            poll_payload = [{"taskType": "getResponse", "taskUUID": task_uuid, "numberResults": 1}]
            async with session.post(
                "https://api.runware.ai/v1",
                json=poll_payload,
                headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"}
            ) as poll:
                if poll.status != 200: continue
                data = (await poll.json()).get("data", [])
                if data:
                    item = data[0]
                    status = item.get("status")
                    if status == "success":
                        video_url = item.get("videoURL") or item.get("videoUrl")
                        if video_url:
                            async with session.get(video_url) as vid:
                                if vid.status == 200:
                                    output_path.parent.mkdir(parents=True, exist_ok=True)
                                    output_path.write_bytes(await vid.read())
                                    return output_path
                    elif status == "error":
                        return None
    return None

# === Initialize Session State ===
if "step" not in st.session_state:
    st.session_state.step = 1
if "segments" not in st.session_state:
    st.session_state.segments = []
if "images" not in st.session_state:
    st.session_state.images = {}
if "image_urls" not in st.session_state:
    st.session_state.image_urls = {}
if "videos" not in st.session_state:
    st.session_state.videos = {}
if "output_dir" not in st.session_state:
    st.session_state.output_dir = None
if "combined_video" not in st.session_state:
    st.session_state.combined_video = None

# === Header ===
st.markdown("""
<div style="text-align: center; padding: 40px 20px 20px;">
    <h1 style="font-size: 48px; font-weight: 800; margin: 0; background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
        Reel Studio
    </h1>
    <p style="color: #d4d4d8; font-size: 16px; margin-top: 8px;">대본 → 이미지 → 영상, 단계별로 확인하며 제작</p>
</div>
""", unsafe_allow_html=True)

# === Progress Steps ===
def render_steps():
    steps_data = [
        (1, "대본 분석"),
        (2, "로고 확인"),
        (3, "이미지 확인"),
        (4, "영상 생성"),
        (5, "완료")
    ]

    html = '<div style="display: flex; justify-content: center; align-items: center; gap: 8px; padding: 20px 0 40px;">'

    for i, (num, label) in enumerate(steps_data):
        is_active = st.session_state.step >= num
        is_current = st.session_state.step == num

        if is_active:
            circle_style = "background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);"
            text_style = "color: #e2e8f0; font-weight: 600;"
        else:
            circle_style = "background: #27272a; color: #9ca3af;"
            text_style = "color: #e5e7eb;"

        if is_current:
            circle_style += " transform: scale(1.1);"

        html += f'''
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; {circle_style}">{num}</div>
            <span style="font-size: 14px; {text_style}">{label}</span>
        </div>
        '''

        if i < len(steps_data) - 1:
            line_color = "#8b5cf6" if st.session_state.step > num else "#27272a"
            html += f'<div style="width: 40px; height: 2px; background: {line_color}; border-radius: 1px;"></div>'

    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

render_steps()

# === STEP 1: 대본 입력 ===
if st.session_state.step == 1:
    st.markdown("""
    <div style="max-width: 700px; margin: 0 auto; padding: 0 20px;">
        <div style="background: rgba(20, 20, 35, 0.6); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 20px; padding: 24px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📝</div>
                <h2 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">대본 입력</h2>
            </div>
            <p style="color: #d4d4d8; font-size: 14px; margin: 0;">자유 형식으로 입력하세요. AI가 자동으로 분석합니다.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    default_text = """루테인: 나 루테인이야! 빈속에 날 먹으면 하나도 흡수 안 되고 다 빠져나가! 꼭 밥 먹고 먹어!

비타민D: 나 비타민D야! 자기 전에 먹으면 뇌가 낮인 줄 알고 잠이 안 와! 아침에 먹어!

비타민A: 나 비타민A야! 고용량 오래 먹으면 간에 쌓여서 탈모 올 수 있어! 적정량만!

마무리: 영양제는 타이밍이 생명! 똑똑하게 먹자!"""

    col1, col2, col3 = st.columns([1, 5, 1])
    with col2:
        script_input = st.text_area("script", value=default_text, height=200, label_visibility="collapsed",
                                     placeholder="아무 형식으로나 대본을 입력하세요...")

        if st.button("🔍 대본 분석하기", use_container_width=True):
            with st.spinner("🤖 AI가 대본을 분석중..."):
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                segments = loop.run_until_complete(analyze_script_with_claude(script_input))
                loop.close()

                if segments:
                    st.session_state.raw_segments = segments
                    st.session_state.segments = convert_to_prompts(segments)

                    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
                    output_dir = OUTPUT_DIR / f"reel_{run_id}"
                    output_dir.mkdir(parents=True, exist_ok=True)
                    st.session_state.output_dir = output_dir

                    st.info("🎨 이미지 생성 중...")
                    progress = st.progress(0)

                    async def gen_all_images():
                        images = {}
                        image_urls = {}
                        tasks = []
                        for i, seg in enumerate(st.session_state.segments):
                            img_path = output_dir / f"{i+1:02d}_{seg['character_name']}.png"
                            seed_url = f"https://www.google.com/s2/favicons?domain={seg['brand_domain']}&sz=256" if seg.get("brand_domain") else None
                            tasks.append(generate_image(seg["image_prompt"], img_path, seed_url))

                        results = await asyncio.gather(*tasks)
                        for i, result in enumerate(results):
                            if result:
                                path, url = result  # 튜플 언패킹
                                images[i] = str(path)
                                image_urls[i] = url
                            progress.progress((i + 1) / len(tasks))
                        return images, image_urls

                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    images, image_urls = loop.run_until_complete(gen_all_images())
                    loop.close()

                    st.session_state.images = images
                    st.session_state.image_urls = image_urls

                    st.session_state.step = 2
                    st.rerun()
                else:
                    st.error("분석 실패. 다시 시도해주세요.")

# === STEP 2: 이미지 확인 ===
elif st.session_state.step == 2:
    st.markdown("""
    <div style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
        <div style="background: rgba(20, 20, 35, 0.6); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 20px; padding: 24px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #a855f7, #ec4899); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🖼️</div>
                <h2 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">이미지 확인</h2>
            </div>
            <p style="color: #d4d4d8; font-size: 14px; margin: 0;">마음에 들지 않는 이미지는 개별 재생성 가능합니다. 모두 확인 후 영상화를 진행하세요.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    segments = st.session_state.segments
    images = st.session_state.images

    cols = st.columns(min(4, len(segments)))

    for i, seg in enumerate(segments):
        with cols[i % 4]:
            # Card header
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 12px 12px 0 0; padding: 10px 16px; margin-bottom: -10px;">
                <span style="color: white; font-weight: 600; font-size: 14px;">{i+1}. {seg['character_name']}</span>
            </div>
            """, unsafe_allow_html=True)

            if i in images and Path(images[i]).exists():
                st.image(images[i], use_container_width=True)

                st.markdown(f"""
                <p style="color: #e5e7eb; font-size: 12px; margin: 8px 0; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    "{seg['dialogue'][:60]}..."
                </p>
                """, unsafe_allow_html=True)

                if st.button(f"🔄 재생성", key=f"regen_{i}", use_container_width=True):
                    with st.spinner("재생성 중..."):
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        img_path = st.session_state.output_dir / f"{i+1:02d}_{seg['character_name']}.png"
                        seed_data = None
                        if i in st.session_state.custom_logos:
                            seed_data = st.session_state.custom_logos[i]
                        elif st.session_state.edited_domains[i]:
                            seed_data = f"https://www.google.com/s2/favicons?domain={st.session_state.edited_domains[i]}&sz=256"

                        result = loop.run_until_complete(generate_image(seg["image_prompt"], img_path, seed_data))
                        loop.close()

                        if result:
                            path, url = result
                            st.session_state.images[i] = str(path)
                            st.session_state.image_urls[i] = url
                            st.rerun()
            else:
                st.markdown("""
                <div style="background: #27272a; border-radius: 12px; height: 200px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #9ca3af;">생성 실패</span>
                </div>
                """, unsafe_allow_html=True)

                if st.button(f"🔄 다시 생성", key=f"retry_{i}", use_container_width=True):
                    with st.spinner("생성 중..."):
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        img_path = st.session_state.output_dir / f"{i+1:02d}_{seg['character_name']}.png"
                        seed_data = None
                        if i in st.session_state.custom_logos:
                            seed_data = st.session_state.custom_logos[i]
                        elif st.session_state.edited_domains[i]:
                            seed_data = f"https://www.google.com/s2/favicons?domain={st.session_state.edited_domains[i]}&sz=256"

                        result = loop.run_until_complete(generate_image(seg["image_prompt"], img_path, seed_data))
                        loop.close()

                        if result:
                            path, url = result
                            st.session_state.images[i] = str(path)
                            st.session_state.image_urls[i] = url
                            st.rerun()

    st.markdown("<div style='height: 40px'></div>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1, 1])
    with col1:
        if st.button("⬅️ 대본으로", use_container_width=True):
            st.session_state.step = 1
            st.session_state.segments = []
            st.session_state.images = {}
            st.rerun()

    with col3:
        valid_images = sum(1 for i in images if Path(images[i]).exists())
        if valid_images == len(segments):
            if st.button("✅ 확정 → 영상 생성", use_container_width=True):
                st.session_state.step = 4
                st.rerun()
        else:
            st.warning(f"⚠️ {len(segments) - valid_images}개 이미지 누락")

# === STEP 4: 영상 생성 ===
elif st.session_state.step == 4:
    st.markdown("""
    <div style="max-width: 700px; margin: 0 auto; padding: 0 20px;">
        <div style="background: rgba(20, 20, 35, 0.6); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: 20px; padding: 24px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ec4899, #f43f5e); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎬</div>
                <h2 style="color: white; font-size: 20px; font-weight: 700; margin: 0;">영상 생성 중</h2>
            </div>
            <p style="color: #d4d4d8; font-size: 14px; margin: 0;">AI가 각 이미지를 영상으로 변환하고 있습니다.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    segments = st.session_state.segments
    images = st.session_state.images
    image_urls = st.session_state.image_urls
    output_dir = st.session_state.output_dir

    col1, col2, col3 = st.columns([1, 3, 1])
    with col2:
        progress = st.progress(0)
        status_text = st.empty()

    async def gen_all_videos():
        videos = {}
        tasks = []
        for i in images:
            seg = segments[i]
            vid_path = output_dir / f"{i+1:02d}_{seg['character_name']}.mp4"
            img_url = image_urls.get(i)
            if img_url:
                tasks.append(generate_video(img_url, seg["video_prompt"], vid_path))

        results = await asyncio.gather(*tasks)
        for idx, (i, result) in enumerate(zip(images.keys(), results)):
            if result:
                videos[i] = str(result)
            progress.progress((idx + 1) / len(tasks))
            status_text.markdown(f"<p style='text-align: center; color: #e5e7eb;'>🎬 {idx + 1}/{len(tasks)} 완료</p>", unsafe_allow_html=True)
        return videos

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    st.session_state.videos = loop.run_until_complete(gen_all_videos())
    loop.close()

    # 영상 합치기
    videos = st.session_state.videos
    if len(videos) >= 2:
        status_text.markdown("<p style='text-align: center; color: #e5e7eb;'>🎬 영상 합치는 중...</p>", unsafe_allow_html=True)
        import subprocess

        # 정렬된 비디오 파일 목록
        video_files = sorted([videos[i] for i in videos], key=lambda x: x)

        # 각 영상 5.5초로 자르기 (대사 + 0.5초 여유)
        trimmed_files = []
        for vf in video_files:
            trimmed = vf.replace('.mp4', '_cut.mp4')
            subprocess.run([
                'ffmpeg', '-i', vf, '-t', '5.5',
                '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-b:a', '128k',
                '-avoid_negative_ts', 'make_zero',
                '-video_track_timescale', '30000',
                trimmed, '-y'
            ], capture_output=True)
            trimmed_files.append(trimmed)

        # filter_complex concat으로 합치기 (더 부드러운 전환)
        final_path = output_dir / "final_combined.mp4"
        n = len(trimmed_files)
        inputs = []
        for tf in trimmed_files:
            inputs.extend(['-i', tf])

        filter_parts = ''.join([f'[{i}:v][{i}:a]' for i in range(n)])
        filter_complex = f'{filter_parts}concat=n={n}:v=1:a=1[outv][outa]'

        subprocess.run([
            'ffmpeg', *inputs,
            '-filter_complex', filter_complex,
            '-map', '[outv]', '-map', '[outa]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            str(final_path), '-y'
        ], capture_output=True)

        if final_path.exists():
            st.session_state.combined_video = str(final_path)

    st.session_state.step = 5
    st.rerun()

# === STEP 5: 완료 ===
elif st.session_state.step == 5:
    st.markdown("""
    <div style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.1)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; padding: 24px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎉</div>
                <h2 style="color: #10b981; font-size: 20px; font-weight: 700; margin: 0;">완료!</h2>
            </div>
            <p style="color: #d4d4d8; font-size: 14px; margin: 0;">모든 영상이 생성되었습니다.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.balloons()

    segments = st.session_state.segments
    videos = st.session_state.videos
    output_dir = st.session_state.output_dir

    col1, col2, col3 = st.columns([1, 1, 1])
    with col2:
        if st.button("📂 폴더 열기", use_container_width=True):
            import subprocess
            subprocess.run(["open", str(output_dir)])

    st.markdown("<div style='height: 20px'></div>", unsafe_allow_html=True)

    cols = st.columns(min(3, len(videos)))

    for idx, (i, video_path) in enumerate(videos.items()):
        with cols[idx % 3]:
            seg = segments[i]
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 12px 12px 0 0; padding: 12px 16px; margin-bottom: -10px;">
                <span style="color: white; font-weight: 600;">{seg['character_name']}</span>
            </div>
            """, unsafe_allow_html=True)

            if Path(video_path).exists():
                st.video(video_path)
                with open(video_path, "rb") as f:
                    st.download_button("⬇️ 다운로드", f.read(), Path(video_path).name, "video/mp4",
                                       key=f"dl_{i}", use_container_width=True)

    # 합친 영상 표시
    if "combined_video" in st.session_state and st.session_state.combined_video:
        combined_path = st.session_state.combined_video
        if Path(combined_path).exists():
            st.markdown("<div style='height: 30px'></div>", unsafe_allow_html=True)
            st.markdown("""
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 12px 12px 0 0; padding: 12px 16px; text-align: center;">
                    <span style="color: white; font-weight: 700; font-size: 16px;">🎬 전체 합친 영상</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                st.video(combined_path)
                with open(combined_path, "rb") as f:
                    st.download_button("⬇️ 전체 영상 다운로드", f.read(), "final_combined.mp4", "video/mp4",
                                       key="dl_combined", use_container_width=True)

    st.markdown("<div style='height: 40px'></div>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1, 1])
    with col2:
        if st.button("🔄 새로 만들기", use_container_width=True):
            st.session_state.step = 1
            st.session_state.segments = []
            st.session_state.images = {}
            st.session_state.image_urls = {}
            st.session_state.videos = {}
            st.session_state.output_dir = None
            st.session_state.combined_video = None
            st.rerun()

# Footer
st.markdown("""
<div style="text-align: center; padding: 40px 0; border-top: 1px solid #27272a; margin-top: 60px;">
    <p style="color: #9ca3af; font-size: 13px;">
        Powered by <span style="color: #8b5cf6;">Grok</span> · <span style="color: #a855f7;">Runware</span> · <span style="color: #ec4899;">Claude</span>
    </p>
</div>
""", unsafe_allow_html=True)
