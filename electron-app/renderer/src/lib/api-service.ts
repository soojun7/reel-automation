// 외부 API 직접 호출 서비스 (Electron용)
import { isElectron, getElectronAPI } from "./electron-api";

// Claude API로 대본 분석
export async function analyzeScriptWithClaude(
  scriptText: string,
  styleId: string,
  globalContext: string,
  claudeApiKey: string
): Promise<any[]> {
  let stylePrompt = "";
  if (styleId === "personification") {
    stylePrompt = `
중요 규칙 - 의인화 스타일:
- character_appearance: 반드시 "실제 [물건 이름] 그 자체가 얼굴과 팔다리를 가진 캐릭터" 형태로 작성해. 사람이 아님!
  예시: "딸기" → "a real strawberry fruit with cute cartoon eyes and smile on its surface, tiny arms and legs"
  예시: "바나나" → "a real yellow banana with kawaii face drawn on the peel, small stick arms and legs"
  예시: "우유" → "a milk carton box with animated face, small arms and legs attached"
- brand_domain: 브랜드/기업/앱 로고 의인화면 도메인 주소 (예: google.com), 아니면 빈 문자열("")
- background_scene: 간단한 배경 (예: kitchen counter, refrigerator interior, gradient background)

목소리 (voice_style): 각 캐릭터마다 다른 목소리 (음높이, 속도, 감정 다양하게)
scene_direction: 과장된 표정과 동작
`;
  } else if (styleId === "anime") {
    stylePrompt = `
중요 규칙:
- brand_domain: 빈 문자열("")
- background_scene: 2D 일본 애니메이션 배경 스타일
- character_appearance: 2D 애니메이션 캐릭터 스타일
`;
  }

  let contextInstruction = "";
  if (globalContext.trim()) {
    contextInstruction = `
추가 참고사항 (모든 세그먼트에 적용):
${globalContext}
`;
  }

  const prompt = `다음 대본을 분석해서 각 세그먼트로 나눠줘. JSON 배열만 반환해.

대본:
${scriptText}

형식:
[{"character_name": "이름", "dialogue": "대사", "voice_style": "목소리 스타일", "scene_direction": "장면 연출", "character_appearance": "캐릭터 외형", "background_scene": "배경 장면", "brand_domain": "브랜드 도메인(선택)"}]

${stylePrompt}
${contextInstruction}
`;

  let content = "";

  // Electron 모드: IPC를 통해 메인 프로세스에서 API 호출 (CORS 우회)
  if (isElectron()) {
    const api = getElectronAPI();
    if (!api) throw new Error("Electron API not available");

    const result = await api.callClaudeApi(claudeApiKey, prompt, "claude-sonnet-4-20250514");
    content = result.content?.[0]?.text || "";
  } else {
    // 웹 모드: 직접 호출 (CORS 문제 발생 가능)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    content = result.content?.[0]?.text || "";
  }

  // JSON 배열 추출
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return [];
}

// 세그먼트를 프롬프트로 변환
export function convertToPrompts(segments: any[], styleId: string, globalContext: string): any[] {
  const result = [];

  let styleModifiers = "";
  if (styleId === "personification") {
    styleModifiers = "anthropomorphic object character, NOT A HUMAN, the object itself has a cute cartoon face drawn on its surface, tiny stick arms and legs, Pixar style 3D render, cute kawaii style";
  } else if (styleId === "anime") {
    styleModifiers = "2D anime style, studio ghibli, makoto shinkai, cel shaded, flat colors, beautiful anime background";
  }

  let contextBackground = "";
  if (globalContext.trim()) {
    const gc = globalContext.toLowerCase();
    if (gc.includes("냉장고")) {
      contextBackground = "BACKGROUND: inside a refrigerator with shelves, cold frosty atmosphere";
    } else if (gc.includes("주방") || gc.includes("키친")) {
      contextBackground = "BACKGROUND: kitchen countertop environment";
    } else {
      contextBackground = `BACKGROUND: ${globalContext}`;
    }
  }

  for (const seg of segments) {
    const name = seg.character_name || "캐릭터";
    const dialogue = seg.dialogue || "";
    const voice = seg.voice_style || "귀엽고 밝은 목소리";
    const scene = seg.scene_direction || "표정을 바꾸며 말함";
    const charAppearance = seg.character_appearance || "";
    const background = seg.background_scene || "simple gradient background";
    const brandDomain = (seg.brand_domain || "").trim();

    const finalBackground = contextBackground || background;

    // 의인화 스타일: 실제 물건이 얼굴과 팔다리를 가진 형태
    let mainSubject = "";
    if (styleId === "personification") {
      mainSubject = `A cute anthropomorphic ${name} character, the actual ${name} object with a happy cartoon face, small arms and legs, ${charAppearance}`;
    } else {
      mainSubject = charAppearance || `cute ${name} character`;
    }

    result.push({
      character_name: name,
      dialogue: dialogue,
      brand_domain: brandDomain,
      is_logo: !!brandDomain,
      image_prompt: `${mainSubject}, ${styleModifiers}, ${finalBackground}, 3D rendered, high quality, vertical composition`,
      video_prompt: `Character "${name}" speaks this dialogue in Korean:
"${dialogue}"

VOICE (most important - unique voice for this character): ${voice}
- This character MUST have a distinctive voice different from all others
- Exaggerated voice acting with dramatic emotions

ACTION: ${scene}
- Big facial expressions, dramatic gestures, cartoon-like movements`,
      seed_image_url: brandDomain ? `https://www.google.com/s2/favicons?domain=${brandDomain}&sz=256` : null,
    });
  }

  return result;
}

// Runware API로 이미지 생성
export async function generateImageWithRunware(
  imagePrompt: string,
  runwareApiKey: string,
  seedImageData?: string | null,
  emotion?: string
): Promise<{ imageUrl: string }> {
  let emotionModifier = "";
  if (emotion === "happy") {
    emotionModifier = ", very happy and joyful expression, smiling broadly";
  } else if (emotion === "kind") {
    emotionModifier = ", kind and gentle expression, warm smile";
  } else if (emotion === "excited") {
    emotionModifier = ", extremely excited and enthusiastic expression, energetic pose";
  } else if (emotion === "sad") {
    emotionModifier = ", sad and crying expression, depressed";
  } else if (emotion === "angry") {
    emotionModifier = ", very angry and furious expression, aggressive pose";
  }

  const finalPrompt = imagePrompt + emotionModifier;
  const negativePrompt = "2D, flat, simple, low quality, blurry, text, watermark, nsfw, anime, sketch, drawing, painting";

  // Electron 모드: IPC를 통해 메인 프로세스에서 API 호출 (CORS 우회)
  if (isElectron()) {
    const api = getElectronAPI();
    if (!api) throw new Error("Electron API not available");

    return await api.callRunwareImage(runwareApiKey, finalPrompt, negativePrompt, seedImageData || undefined);
  }

  // 웹 모드: 직접 호출 (CORS 문제 발생 가능)
  const payload: any = {
    taskType: "imageInference",
    taskUUID: crypto.randomUUID(),
    positivePrompt: finalPrompt,
    negativePrompt: negativePrompt,
    width: 768,
    height: 1344,  // 64의 배수 (9:16 비율)
    model: "runware:100@1",
    numberResults: 1,
    outputFormat: "PNG",
  };

  if (seedImageData) {
    payload.inputs = {
      referenceImages: [seedImageData],
    };
  }

  const response = await fetch("https://api.runware.ai/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runwareApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([payload]),
  });

  if (!response.ok) {
    throw new Error(`Runware API error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.imageURL || data.data?.[0]?.imageUrl;

  if (!imageUrl) {
    throw new Error("No image URL in response");
  }

  return { imageUrl };
}

// Runware API로 영상 생성
export async function generateVideoWithRunware(
  videoPrompt: string,
  imageUrl: string,
  runwareApiKey: string,
  dialogue?: string,
  emotion?: string
): Promise<{ videoUrl: string }> {
  // 대사 길이에 따른 영상 길이 계산
  const dialogueLen = dialogue?.length || 0;
  const duration = dialogueLen > 0 ? Math.max(5, Math.min(15, Math.floor(dialogueLen / 7))) : 5;

  // 감정에 따른 목소리 톤
  let emotionModifier = "";
  if (emotion === "happy") {
    emotionModifier = "\n\nVOICE EMOTION: Speak with a VERY HAPPY, cheerful, bright tone!";
  } else if (emotion === "kind") {
    emotionModifier = "\n\nVOICE EMOTION: Speak with a WARM, gentle, caring tone!";
  } else if (emotion === "excited") {
    emotionModifier = "\n\nVOICE EMOTION: Speak with HIGH ENERGY, enthusiastic tone!";
  } else if (emotion === "sad") {
    emotionModifier = "\n\nVOICE EMOTION: Speak with a SAD, melancholic tone!";
  } else if (emotion === "angry") {
    emotionModifier = "\n\nVOICE EMOTION: Speak with an ANGRY, furious tone!";
  }

  const finalPrompt = videoPrompt + emotionModifier;

  // Electron 모드: IPC를 통해 메인 프로세스에서 API 호출 (CORS 우회)
  if (isElectron()) {
    const api = getElectronAPI();
    if (!api) throw new Error("Electron API not available");

    return await api.callRunwareVideo(runwareApiKey, finalPrompt, imageUrl, duration);
  }

  // 웹 모드: 직접 호출 (CORS 문제 발생 가능)
  const taskUUID = crypto.randomUUID();

  // 1. 비디오 생성 요청
  const response = await fetch("https://api.runware.ai/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runwareApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        taskType: "videoInference",
        taskUUID: taskUUID,
        model: "xai:grok-imagine@video",
        outputFormat: "mp4",
        height: 1280,
        width: 720,
        numberResults: 1,
        inputs: { frameImages: [{ image: imageUrl }] },
        positivePrompt: finalPrompt,
        duration: duration,
        deliveryMethod: "async",
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(`Runware video API error: ${response.status}`);
  }

  // 2. 폴링으로 결과 대기 (최대 3분)
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollResponse = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runwareApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        { taskType: "getResponse", taskUUID: taskUUID, numberResults: 1 },
      ]),
    });

    if (pollResponse.ok) {
      const data = await pollResponse.json();
      const item = data.data?.[0];

      if (item?.status === "success") {
        const videoUrl = item.videoURL || item.videoUrl;
        if (videoUrl) {
          return { videoUrl };
        }
      } else if (item?.status === "error") {
        throw new Error("Video generation failed");
      }
    }
  }

  throw new Error("Video generation timeout");
}
