import os
import sys
from pathlib import Path
import json
import base64
import uuid
import asyncio
import aiohttp
import tempfile
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import boto3
from botocore.config import Config

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from config import RUNWARE_API_KEY, WAVESPEED_API_KEY, OUTPUT_DIR
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")

# Cloudflare R2 설정
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "tellolabs")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")
R2_PREFIX = "reel-automation"  # 디렉토리 prefix

# R2 클라이언트 초기화
s3_client = None
if R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        's3',
        endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto'
    )
    print(f"[R2] Connected to bucket: {R2_BUCKET_NAME}, prefix: {R2_PREFIX}/")

def upload_to_r2(file_path: str, key: str, content_type: str = None) -> str:
    """파일을 R2에 업로드하고 public URL 반환"""
    if not s3_client:
        raise Exception("R2 not configured")

    full_key = f"{R2_PREFIX}/{key}"
    extra_args = {}
    if content_type:
        extra_args['ContentType'] = content_type

    s3_client.upload_file(file_path, R2_BUCKET_NAME, full_key, ExtraArgs=extra_args)
    return f"{R2_PUBLIC_URL}/{full_key}"

def upload_bytes_to_r2(data: bytes, key: str, content_type: str = None) -> str:
    """바이트 데이터를 R2에 업로드하고 public URL 반환"""
    if not s3_client:
        raise Exception("R2 not configured")

    full_key = f"{R2_PREFIX}/{key}"
    extra_args = {}
    if content_type:
        extra_args['ContentType'] = content_type

    s3_client.put_object(Bucket=R2_BUCKET_NAME, Key=full_key, Body=data, **extra_args)
    return f"{R2_PUBLIC_URL}/{full_key}"

async def download_to_temp(url: str, suffix: str = ".mp4") -> str:
    """URL에서 파일을 다운로드해서 임시 파일로 저장"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                raise Exception(f"Failed to download: {url}")
            data = await resp.read()

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(data)
    temp_file.close()
    return temp_file.name

app = FastAPI(title="Reel Studio API")

# Health check endpoint for Render
@app.get("/health")
@app.head("/health")
async def health_check():
    return {"status": "ok"}

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the output directory statically
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(OUTPUT_DIR)), name="media")

# Serve frontend static files (for production)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    from fastapi.responses import FileResponse, Response

    @app.get("/")
    @app.head("/")
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    # Serve static assets
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    # Catch-all for SPA routing (must be after API routes)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If it's an API route or media, skip
        if full_path.startswith("api/") or full_path.startswith("media/"):
            raise HTTPException(status_code=404)
        # Serve index.html for SPA routing
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")

class AnalyzeRequest(BaseModel):
    script_text: str
    style_id: str = "personification" # default style
    global_context: str = "" # 참고사항 (배경, 분위기 등 공통 적용 사항)

class ImageGenerateRequest(BaseModel):
    segment_index: int
    character_name: str
    image_prompt: str
    seed_image_data: Optional[str] = None # can be a url or base64 data URI
    run_id: str
    emotion: Optional[str] = "normal"

class VideoGenerateRequest(BaseModel):
    segment_index: int
    character_name: str
    video_prompt: str
    image_url: str  # Runware URL (https://im.runware.ai/...)
    run_id: str
    dialogue: str = ""  # 대사 (길이에 따라 영상 길이 조절)
    emotion: str = "normal"  # 감정 (목소리 톤 반영)

class CombineVideosRequest(BaseModel):
    video_urls: List[str]
    run_id: str

async def analyze_script_with_claude(script_text: str, style_id: str, global_context: str = "") -> List[dict]:
    # Style-specific prompts
    style_prompt = ""
    if style_id == "personification":
        style_prompt = """
중요 규칙:
- brand_domain: 만약 캐릭터가 특정 브랜드, 기업, 앱, 서비스 로고를 의인화한 것이라면 해당 브랜드의 공식 영문 도메인 주소를 적어줘 (예: 구글이면 google.com, 유튜브면 youtube.com, 넷플릭스면 netflix.com 등). 특정 브랜드가 아니면 빈 문자열("")로 남겨둬.
- background_scene: 포토리얼리스틱한 실제 환경!
  - 실제 주방, 식탁, 침실, 카페 등 현실적인 공간
  - 얕은 피사계 심도 (배경 블러 효과)
  - 따뜻한 자연광 또는 실내 조명
  - 김, 물방울, 먼지 입자 등 분위기 요소
  - 관련 소품 배치 (음식 옆에는 접시, 숟가락 등)
- character_appearance: 실제 사물의 재질과 질감을 100% 유지한 의인화!

  **스타일 규칙 (매우 중요!):**
  - 실제 사물의 재질/질감/색상을 그대로 유지
  - 얼굴은 사물 표면에 직접 표현 (큰 눈, 이빨 보이는 입)
  - 팔다리는 같은 재질로 작게 추가
  - 표정은 극도로 과장 (화남, 놀람, 짜증 등 이빨 드러내며)
  - 포토리얼리스틱 CG 스타일 (픽사/디즈니 퀄리티)

목소리 (voice_style) - 핵심! 각 캐릭터마다 반드시 완전히 다른 목소리로:
- 절대로 같은 목소리 사용 금지! 모든 캐릭터가 구별되는 개성 있는 목소리 필수!
- 음높이 다양하게: 매우 높은 삐약삐약/중간/낮고 굵은/바닥을 기는 저음
- 말 속도 다양하게: 총알처럼 빠르게/느긋하게 늘어지게/또박또박 끊어서
- 감정 다양하게: 짜증폭발/졸려서 하품섞인/걱정돼서 떨리는/신나서 들뜬/화나서 으르렁
- 특징적 말투: 콧소리 섞인/쉰 목소리/애교 섞인/권위적인/수줍은
- 예시들 (각 캐릭터마다 이 중 다른 걸로):
  - "삐약삐약 높은 음으로 빠르게 재잘재잘"
  - "낮고 굵은 목소리로 느릿느릿 무겁게"
  - "콧소리 섞인 짜증난 말투로 투덜투덜"
  - "떨리는 목소리로 걱정스럽게 조심조심"
  - "신난 아이처럼 들뜬 목소리로 통통 튀게"

scene_direction: 오버액션으로 과장된 동작
- 예시: "발을 동동 구르며, 양팔을 휘저으며, 고개를 세차게 흔들며"
- 예시: "크게 하품하며, 눈을 비비며, 베개를 껴안으며"
- 예시: "배를 움켜쥐고 휘청거리며, 얼굴이 초록색으로 변하며"
"""
    elif style_id == "anime":
        style_prompt = """
중요 규칙:
- brand_domain: 빈 문자열("")로 남겨둬.
- background_scene: 2D 일본 애니메이션 배경 스타일!
  - 밝고 채도가 높은 색상, 아름다운 구름과 하늘
  - 지브리 스튜디오나 신카이 마코토 작품 같은 서정적인 분위기
- character_appearance: 2D 애니메이션 캐릭터 스타일!
  - 큰 눈, 섬세한 머리카락 표현
  - 귀엽고 매력적인 2D 디자인
목소리 (voice_style): 
- 애니메이션 성우처럼 과장되고 감정이 풍부한 목소리
scene_direction: 
- 애니메이션 특유의 리액션 (땀방울, 반짝이는 눈 등)
"""
    else:
        # Default fallback
        style_prompt = "자유로운 스타일로 묘사해줘."

    # 참고사항이 있으면 추가
    context_instruction = ""
    if global_context.strip():
        context_instruction = f"""
추가 참고사항 (모든 세그먼트에 적용):
{global_context}

위 참고사항을 각 캐릭터의 배경(background_scene)과 외형(character_appearance)에 적절히 반영해줘.
단, 각 캐릭터마다 구도, 앵글, 배경 디테일이 달라야 해! 똑같은 배경 반복 금지!
"""

    prompt = f"""다음 대본을 분석해서 각 세그먼트로 나눠줘. JSON 배열만 반환해.

대본:
{script_text}

형식:
[{{"character_name": "이름", "dialogue": "대사", "voice_style": "목소리 스타일", "scene_direction": "장면 연출", "character_appearance": "캐릭터 외형", "background_scene": "배경 장면", "brand_domain": "브랜드 도메인(선택)"}}]

{style_prompt}
{context_instruction}
"""

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514", "max_tokens": 4096, "messages": [{"role": "user", "content": prompt}]}
        ) as resp:
            if resp.status != 200:
                print(f"Claude Error: {await resp.text()}")
                return []
            result = await resp.json()
            content = result.get("content", [{}])[0].get("text", "")
            try:
                import re
                match = re.search(r'\[[\s\S]*\]', content)
                if match: return json.loads(match.group())
            except: pass
            return []

def convert_to_prompts(segments: List[dict], style_id: str, global_context: str = "") -> List[dict]:
    result = []

    style_modifiers = ""
    if style_id == "personification":
        style_modifiers = "extremely exaggerated facial expression with big eyes and visible teeth showing emotion, small arms and legs made of same material, Pixar Disney quality render"
    elif style_id == "anime":
        style_modifiers = "2D anime style, studio ghibli, makoto shinkai, cel shaded, flat colors, beautiful anime background"
    elif style_id == "realistic":
        style_modifiers = "ultra realistic, 8k resolution, highly detailed, photorealistic photography, sharp focus"
    elif style_id == "3d-render":
        style_modifiers = "3D render, unreal engine 5, octane render, octane, volumetric lighting"
    elif style_id == "minimalist":
        style_modifiers = "minimalist, clean lines, simple shapes, flat colors, vector art"
    elif style_id == "watercolor":
        style_modifiers = "watercolor painting, soft edges, ethereal, artistic"
    elif style_id == "pop-art":
        style_modifiers = "pop art, bold colors, comic book style, halftone dots"

    # 참고사항이 있으면 배경 설명으로 변환
    context_background = ""
    if global_context.strip():
        # 냉장고 관련 키워드 감지 및 영문 변환
        gc = global_context.lower()
        if "냉장고" in gc:
            context_background = "IMPORTANT BACKGROUND: inside a refrigerator, cold frosty interior with shelves, cold mist, ice crystals, refrigerator lighting"
        elif "주방" in gc or "키친" in gc:
            context_background = "IMPORTANT BACKGROUND: kitchen environment, countertop, cooking utensils"
        elif "식탁" in gc:
            context_background = "IMPORTANT BACKGROUND: dining table setting, plates, cutlery"
        else:
            # 일반적인 경우 그대로 추가
            context_background = f"IMPORTANT BACKGROUND CONTEXT: {global_context}"

    for seg in segments:
        name = seg.get("character_name", "캐릭터")
        dialogue = seg.get("dialogue", "")
        voice = seg.get("voice_style", "귀엽고 밝은 목소리")
        scene = seg.get("scene_direction", "표정을 바꾸며 말함")
        char_appearance = seg.get("character_appearance", f"cute {name} character")
        background = seg.get("background_scene", "clean minimal background")
        brand_domain = (seg.get("brand_domain") or "").strip()

        # 참고사항이 있으면 배경 대체, 없으면 기존 배경 사용
        final_background = context_background if context_background else background

        result.append({
            "character_name": name,
            "dialogue": dialogue,
            "brand_domain": brand_domain,
            "is_logo": bool(brand_domain),
            "image_prompt": f"{final_background}, Hyper realistic 3D render, {char_appearance}, {style_modifiers}, shallow depth of field with blurred background, cold lighting with blue tint, photorealistic textures and materials, steam or frost particles for atmosphere, vertical 9:16 aspect ratio",
            "video_prompt": f"""Character "{name}" speaks this dialogue in Korean:
"{dialogue}"

VOICE (most important - unique voice for this character): {voice}
- This character MUST have a distinctive voice different from all others
- Exaggerated voice acting with dramatic emotions matching the voice style above

ACTION: {scene}
- Big facial expressions, dramatic gestures, cartoon-like movements"""
        })
    return result

@app.post("/api/analyze")
async def analyze_script(req: AnalyzeRequest):
    print(f"[analyze] global_context received: '{req.global_context}'")
    segments = await analyze_script_with_claude(req.script_text, req.style_id, req.global_context)
    if not segments:
        raise HTTPException(status_code=500, detail="Failed to analyze script")

    prompts = convert_to_prompts(segments, req.style_id, req.global_context)
    print(f"[analyze] First segment image_prompt: {prompts[0]['image_prompt'][:200]}...")
    
    # Generate a run ID for this session
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / f"reel_{run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Fill in default initial logo urls for personification
    for i, p in enumerate(prompts):
        if p["brand_domain"]:
            p["seed_image_url"] = f"https://www.google.com/s2/favicons?domain={p['brand_domain']}&sz=256"
        else:
            p["seed_image_url"] = None
            
    return {
        "run_id": run_id,
        "segments": prompts
    }

async def describe_logo_with_claude(image_data: str) -> str:
    try:
        b64_data = ""
        media_type = "image/png"
        
        if image_data.startswith("http"):
            async with aiohttp.ClientSession() as session:
                async with session.get(image_data) as resp:
                    if resp.status == 200:
                        b64_data = base64.b64encode(await resp.read()).decode("utf-8")
                        media_type = resp.headers.get("Content-Type", "image/png")
        elif image_data.startswith("data:image"):
            # format: data:image/jpeg;base64,...
            header, b64_data = image_data.split(",", 1)
            media_type = header.split(":")[1].split(";")[0]
            
        if not b64_data:
            return ""
            
        payload = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 100,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {"type": "text", "text": "Describe the core visual features of this logo (shape, colors, typography, distinctive elements) in English. Keep it under 20 words, focusing only on visuals."}
                    ],
                }
            ],
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get("content", [{}])[0].get("text", "")
    except Exception as e:
        print(f"Error describing logo: {e}")
    return ""

@app.post("/api/generate-image")
async def generate_image_api(req: ImageGenerateRequest):
    print(f"[generate-image] Request: {req}")
    try:
        output_dir = OUTPUT_DIR / f"reel_{req.run_id}"
        output_dir.mkdir(parents=True, exist_ok=True)
        img_path = output_dir / f"{req.segment_index+1:02d}_{req.character_name}.png"

        # Map the selected emotion to a specific prompt modifier
        emotion_modifier = ""
        if req.emotion == "happy":
            emotion_modifier = ", very happy and joyful expression, smiling broadly"
        elif req.emotion == "kind":
            emotion_modifier = ", kind and gentle expression, warm smile"
        elif req.emotion == "excited":
            emotion_modifier = ", extremely excited and enthusiastic expression, energetic pose"
        elif req.emotion == "sad":
            emotion_modifier = ", sad and crying expression, depressed"
        elif req.emotion == "angry":
            emotion_modifier = ", very angry and furious expression, aggressive pose"

        # Claude Vision 로고 분석은 스킵 (속도 향상)
        # referenceImages로 로고를 직접 전달하므로 별도 분석 불필요

        final_prompt = req.image_prompt + emotion_modifier

        async with aiohttp.ClientSession() as session:
            payload = {
                "taskType": "imageInference",
                "taskUUID": str(uuid.uuid4()),
                "positivePrompt": final_prompt,
                "negativePrompt": "2D, flat, simple, low quality, blurry, text, watermark, nsfw, anime, sketch, drawing, painting, abstract background, plain background, solid color background",
                "width": 768,
                "height": 1376,
                "model": "google:4@3",
                "numberResults": 1,
                "outputFormat": "PNG"
            }

            # 로고 이미지가 있으면 referenceImages로 추가
            if req.seed_image_data:
                ref_url = req.seed_image_data
                # Google favicon URL은 리다이렉트되므로 최종 URL 확인
                if "google.com/s2/favicons" in ref_url:
                    try:
                        async with session.head(ref_url, allow_redirects=True) as head_resp:
                            ref_url = str(head_resp.url)
                            print(f"Resolved favicon URL: {ref_url}")
                    except:
                        pass
                payload["inputs"] = {
                    "referenceImages": [ref_url]
                }

            async with session.post("https://api.runware.ai/v1/images", json=[payload],
                                    headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
                                    timeout=aiohttp.ClientTimeout(total=90)) as resp:
                if resp.status != 200:
                    print(f"Runware Error: {await resp.text()}")
                    raise HTTPException(status_code=500, detail="Runware API failed")

                data = (await resp.json()).get("data", [])
                if data:
                    runware_url = data[0].get("imageURL") or data[0].get("imageUrl")
                    if runware_url:
                        # Runware CDN URL 바로 반환 (로컬 다운로드 스킵 = 속도 향상)
                        return {
                            "image_url": runware_url,
                            "runware_url": runware_url
                        }

            raise HTTPException(status_code=500, detail="Image generation failed - no data")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[generate-image] Exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image generation error: {str(e)}")

@app.post("/api/generate-video")
async def generate_video_api(req: VideoGenerateRequest):
    output_dir = OUTPUT_DIR / f"reel_{req.run_id}"
    output_dir.mkdir(parents=True, exist_ok=True)
    vid_path = output_dir / f"{req.segment_index+1:02d}_{req.character_name}.mp4"

    # 대사 길이에 따라 영상 길이 계산
    # 88자 = 12초 기준 → 약 7글자/초, Grok은 1-15초 지원
    dialogue_len = len(req.dialogue) if req.dialogue else 0
    # 글자수 / 7, 최소 5초 ~ 최대 15초
    duration = max(5, min(15, dialogue_len // 7)) if dialogue_len > 0 else 5

    dialogue_preview = (req.dialogue or "")[:50]
    print(f"[generate-video] dialogue: '{dialogue_preview}' len={dialogue_len}, duration={duration}s, emotion={req.emotion}")
    print(f"[generate-video] video_prompt length: {len(req.video_prompt) if req.video_prompt else 0}")

    # 감정에 따른 목소리 톤 지시 추가
    emotion_voice_modifier = ""
    if req.emotion == "happy":
        emotion_voice_modifier = "\n\nVOICE EMOTION: Speak with a VERY HAPPY, cheerful, bright tone. Voice should sound joyful and upbeat!"
    elif req.emotion == "kind":
        emotion_voice_modifier = "\n\nVOICE EMOTION: Speak with a WARM, gentle, caring tone. Voice should sound soft and friendly!"
    elif req.emotion == "excited":
        emotion_voice_modifier = "\n\nVOICE EMOTION: Speak with HIGH ENERGY, enthusiastic, thrilled tone. Voice should sound pumped up and excited!"
    elif req.emotion == "sad":
        emotion_voice_modifier = "\n\nVOICE EMOTION: Speak with a SAD, melancholic, sorrowful tone. Voice should sound depressed and gloomy!"
    elif req.emotion == "angry":
        emotion_voice_modifier = "\n\nVOICE EMOTION: Speak with an ANGRY, furious, aggressive tone. Voice should sound irritated and mad!"

    final_video_prompt = req.video_prompt + emotion_voice_modifier

    task_uuid = str(uuid.uuid4())
    payload = [{
        "taskType": "videoInference",
        "taskUUID": task_uuid,
        "model": "xai:grok-imagine@video",
        "outputFormat": "mp4",
        "height": 1280,
        "width": 720,
        "numberResults": 1,
        "inputs": {"frameImages": [{"image": req.image_url}]},
        "positivePrompt": final_video_prompt,
        "duration": duration,
        "deliveryMethod": "async"
    }]

    print(f"[generate-video] Sending payload with duration={duration}: {payload}")

    async with aiohttp.ClientSession() as session:
        # 1. 비디오 생성 요청
        async with session.post(
            "https://api.runware.ai/v1/videos",
            json=payload,
            headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"},
            timeout=aiohttp.ClientTimeout(total=60)
        ) as resp:
            resp_text = await resp.text()
            print(f"[generate-video] Runware response: {resp_text[:500]}")
            if resp.status != 200:
                print(f"Runware Video Error: {resp_text}")
                raise HTTPException(status_code=500, detail="Runware video API failed")

        # 2. 결과 폴링 (최대 3분)
        for _ in range(36):
            await asyncio.sleep(5)
            poll_payload = [{"taskType": "getResponse", "taskUUID": task_uuid, "numberResults": 1}]
            async with session.post(
                "https://api.runware.ai/v1",
                json=poll_payload,
                headers={"Authorization": f"Bearer {RUNWARE_API_KEY}", "Content-Type": "application/json"}
            ) as poll:
                if poll.status != 200:
                    continue
                data = (await poll.json()).get("data", [])
                if data:
                    item = data[0]
                    status = item.get("status")
                    if status == "success":
                        video_url = item.get("videoURL") or item.get("videoUrl")
                        if video_url:
                            # Runware CDN URL 바로 반환 (로컬 다운로드 스킵)
                            return {"video_url": video_url}
                    elif status == "error":
                        raise HTTPException(status_code=500, detail="Runware video generation failed")

    raise HTTPException(status_code=500, detail="Video generation timeout")

@app.post("/api/combine-videos")
async def combine_videos_api(req: CombineVideosRequest):
    """영상들을 다운로드 → ffmpeg로 합치기 → R2에 업로드"""
    import subprocess
    import shutil

    # ffmpeg 존재 확인
    if not shutil.which('ffmpeg'):
        print("[combine] ERROR: ffmpeg not found!")
        raise HTTPException(status_code=500, detail="ffmpeg not installed on server")

    if not req.video_urls:
        raise HTTPException(status_code=400, detail="No video URLs provided")

    print(f"[combine] Starting combine for {len(req.video_urls)} videos, run_id={req.run_id}")
    print(f"[combine] URLs: {req.video_urls}")

    temp_files = []
    trimmed_files = []

    try:
        # 1. 모든 영상 다운로드
        print(f"[combine] Downloading {len(req.video_urls)} videos...")
        for i, url in enumerate(req.video_urls):
            try:
                temp_path = await download_to_temp(url, suffix=f"_{i}.mp4")
                temp_files.append(temp_path)
                print(f"[combine] Downloaded {i+1}/{len(req.video_urls)}: {temp_path}")
            except Exception as e:
                print(f"[combine] ERROR downloading video {i}: {e}")
                raise

        # 2. 각 영상 처리 (끝 무음 감지 + 자르기)
        for i, vf in enumerate(temp_files):
            trimmed = vf.replace('.mp4', '_cut.mp4')

            # 영상 길이 확인
            probe_result = subprocess.run([
                'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1', vf
            ], capture_output=True, text=True)
            try:
                video_duration = float(probe_result.stdout.strip())
            except:
                video_duration = 15.0  # 기본값
            print(f"[combine] Video {i+1} duration: {video_duration:.2f}s")

            # 끝 무음 감지
            detect_result = subprocess.run([
                'ffmpeg', '-i', vf, '-af', 'silencedetect=noise=-30dB:d=0.3',
                '-f', 'null', '-'
            ], capture_output=True, text=True)

            silence_starts = []
            for line in detect_result.stderr.split('\n'):
                if 'silence_start:' in line:
                    try:
                        start = float(line.split('silence_start:')[1].split()[0])
                        silence_starts.append(start)
                    except:
                        pass

            # 끝 무음 시작점 (없으면 원본 길이의 90% 또는 영상 끝)
            if silence_starts and silence_starts[-1] > 1.0:
                cut_time = min(silence_starts[-1] + 0.3, video_duration)
            else:
                cut_time = video_duration  # 무음 없으면 전체 사용

            print(f"[combine] Video {i+1}: cutting at {cut_time:.2f}s (original: {video_duration:.2f}s)")

            # 자르기 + 스케일 + 인코딩
            subprocess.run([
                'ffmpeg', '-i', vf, '-t', str(cut_time),
                '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-b:a', '128k',
                '-avoid_negative_ts', 'make_zero',
                '-video_track_timescale', '30000',
                trimmed, '-y'
            ], capture_output=True)
            trimmed_files.append(trimmed)

        # 3. 영상 합치기
        n = len(trimmed_files)
        inputs = []
        for tf in trimmed_files:
            inputs.extend(['-i', tf])

        filter_parts = ''.join([f'[{i}:v][{i}:a]' for i in range(n)])
        filter_complex = f'{filter_parts}concat=n={n}:v=1:a=1[outv][outa]'

        final_temp = tempfile.NamedTemporaryFile(delete=False, suffix='_combined.mp4')
        final_temp.close()

        result = subprocess.run([
            'ffmpeg', *inputs,
            '-filter_complex', filter_complex,
            '-map', '[outv]', '-map', '[outa]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            final_temp.name, '-y'
        ], capture_output=True, text=True)

        if not os.path.exists(final_temp.name) or os.path.getsize(final_temp.name) == 0:
            print(f"[combine] ffmpeg error: {result.stderr}")
            raise HTTPException(status_code=500, detail="ffmpeg combination failed")

        # 4. R2에 업로드
        r2_key = f"runs/{req.run_id}/final_combined.mp4"
        r2_url = upload_to_r2(final_temp.name, r2_key, content_type='video/mp4')
        print(f"[combine] Uploaded to R2: {r2_url}")

        return {"video_url": r2_url}

    finally:
        # 임시 파일 정리
        for f in temp_files + trimmed_files:
            try:
                if os.path.exists(f):
                    os.unlink(f)
            except:
                pass
        try:
            if 'final_temp' in locals() and os.path.exists(final_temp.name):
                os.unlink(final_temp.name)
        except:
            pass
