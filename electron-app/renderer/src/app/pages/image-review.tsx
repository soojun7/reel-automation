import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { RefreshCw, Maximize2, Sparkles, Send } from "lucide-react";
import { motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useProject, Segment } from "../contexts/project-context";
import { useSettings } from "../contexts/settings-context";
import { generateImageWithRunware } from "../../lib/api-service";
import { isElectron, getElectronAPI } from "../../lib/electron-api";

export default function ImageReview() {
  const navigate = useNavigate();
  const { segments, updateSegment, runId, globalEmotion, initProjectDir } = useProject();
  const { runwareApiKey, isConfigured } = useSettings();
  const [selectedImage, setSelectedImage] = useState<Segment | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isInitialGenerating, setIsInitialGenerating] = useState(true);
  const hasStartedRef = useRef(false);

  const [regenerateRequest, setRegenerateRequest] = useState<{
    index: number | null;
    segment: Segment | null;
    open: boolean;
    prompt: string;
  }>({ index: null, segment: null, open: false, prompt: "" });

  useEffect(() => {
    // Check API key
    if (!runwareApiKey) {
      setIsInitialGenerating(false);
      return;
    }

    // Determine if we need to generate images (i.e. they don't have URLs yet)
    const needsGeneration = segments.some(s => !s.generated_image_url);
    if (!needsGeneration) {
      setIsInitialGenerating(false);
      return;
    }

    // Prevent duplicate runs
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const generateImages = async () => {
      // Initialize project directory for Electron
      let dirs: { projectDir: string; imagesDir: string; videosDir: string } | null = null;
      if (isElectron()) {
        dirs = await initProjectDir();
      }

      const promises = segments.map(async (seg, index) => {
        if (seg.generated_image_url) return; // skip already generated

        try {
          // Call Runware API directly
          const result = await generateImageWithRunware(
            seg.image_prompt,
            runwareApiKey,
            seg.seed_image_data || seg.seed_image_url || null,
            seg.emotion || globalEmotion
          );

          let localPath: string | undefined;

          // Download to local in Electron mode
          if (isElectron() && dirs) {
            const api = getElectronAPI();
            if (api) {
              const filename = `${index + 1}_${seg.character_name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`;
              const savePath = `${dirs.imagesDir}/${filename}`;
              await api.downloadFile(result.imageUrl, savePath);
              localPath = savePath;
            }
          }

          updateSegment(index, {
            generated_image_url: result.imageUrl,
            runware_url: result.imageUrl,
            local_image_path: localPath
          });
        } catch (e: any) {
          console.error("Failed to generate image for segment", index, e);
        }
      });

      await Promise.all(promises);
      setIsInitialGenerating(false);
    };

    generateImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const handleRegenerateClick = (segment: Segment, index: number) => {
    setRegenerateRequest({ segment, index, open: true, prompt: "" });
  };

  const handleRegenerateSubmit = async () => {
    const { segment, index, prompt } = regenerateRequest;
    if (index === null || !segment) return;

    // Temporarily clear the URL to show loading
    updateSegment(index, { generated_image_url: undefined, runware_url: undefined, local_image_path: undefined });
    setRegenerateRequest({ segment: null, index: null, open: false, prompt: "" });

    try {
      const newPrompt = segment.image_prompt + " " + prompt;

      const result = await generateImageWithRunware(
        newPrompt,
        runwareApiKey,
        segment.seed_image_data || segment.seed_image_url || null,
        segment.emotion || globalEmotion
      );

      let localPath: string | undefined;

      // Download to local in Electron mode
      if (isElectron()) {
        const api = getElectronAPI();
        if (api) {
          const dirs = await initProjectDir();
          if (dirs) {
            const filename = `${index + 1}_${segment.character_name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_regen.png`;
            const savePath = `${dirs.imagesDir}/${filename}`;
            await api.downloadFile(result.imageUrl, savePath);
            localPath = savePath;
          }
        }
      }

      updateSegment(index, {
        generated_image_url: result.imageUrl,
        runware_url: result.imageUrl,
        local_image_path: localPath
      });
    } catch (e: any) {
      console.error(e);
      alert("재생성 실패: " + e.message);
    }
  };

  const handleConfirm = () => {
    navigate("/video-generation");
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto space-y-12"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 mb-6"
          >
            <Sparkles className="w-10 h-10 text-[var(--primary-500)]" />
          </motion.div>
          <h1 className="text-5xl font-bold text-[var(--text-100)] tracking-tight">
            이미지 확인
          </h1>
          <p className="text-xl text-[var(--text-400)]">
            마음에 들지 않는 이미지는 개별 재생성 가능합니다
          </p>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {segments.map((segment, index) => {
            const isGenerating = !segment.generated_image_url;
            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
              
              <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] hover:border-[var(--primary-400)] rounded-3xl overflow-hidden transition-all shadow-xl">
                {/* Badge */}
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-full text-white text-sm font-semibold shadow-lg">
                  {index + 1}. {segment.character_name}
                </div>

                {/* Image */}
                <div className="aspect-[9/16] relative bg-[var(--bg-700)]">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-[var(--primary-500)]/30 border-t-[var(--primary-500)] rounded-full animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-400)]">
                        생성 중...
                      </p>
                    </div>
                  ) : (
                    <>
                      <img
                        src={segment.generated_image_url || ""}
                        alt={segment.character_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        onClick={() => { setSelectedImage(segment); setSelectedImageIndex(index); }}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-xl backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                      >
                        <Maximize2 className="w-5 h-5 text-white" />
                      </button>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <p className="text-sm text-[var(--text-300)] line-clamp-2">
                    "{segment.dialogue}"
                  </p>

                  <button
                    onClick={() => handleRegenerateClick(segment, index)}
                    disabled={isGenerating}
                    className="w-full px-4 py-2.5 bg-[var(--bg-700)] hover:bg-gradient-to-r hover:from-[var(--primary-500)] hover:to-[var(--secondary-500)] border border-[var(--border)] hover:border-transparent rounded-xl text-sm font-medium text-[var(--text-200)] hover:text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isGenerating ? "animate-spin" : ""
                      }`}
                    />
                    재생성
                  </button>
                </div>
              </div>
            </motion.div>
          )})}
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <button
            onClick={handleConfirm}
            disabled={segments.some((s) => !s.generated_image_url) || isInitialGenerating}
            className="px-8 py-4 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[var(--primary-500)]/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 hover:shadow-[var(--primary-500)]/50"
          >
            영상 생성 시작 →
          </button>
        </motion.div>
      </motion.div>

      {/* Regenerate Request Modal */}
      <Dialog.Root
        open={regenerateRequest.open}
        onOpenChange={(open) =>
          !open && setRegenerateRequest({ segment: null, index: null, open: false, prompt: "" })
        }
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
          <Dialog.Content 
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
          >
            <Dialog.Title className="sr-only">이미지 재생성</Dialog.Title>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-800)]/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl"
            >
              <div className="flex flex-col md:flex-row">
                {/* Image Preview Section */}
                {regenerateRequest.segment?.generated_image_url && (
                  <div className="md:w-1/2 aspect-[9/16] md:aspect-auto relative bg-[var(--bg-700)]">
                    <img
                      src={regenerateRequest.segment.generated_image_url}
                      alt={regenerateRequest.segment.character_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-full text-white text-sm font-semibold shadow-lg">
                      {regenerateRequest.segment.character_name}
                    </div>
                  </div>
                )}

                {/* Form Section */}
                <div className="md:w-1/2 p-8 space-y-6">
                  <div className="text-center md:text-left space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 mb-3">
                      <RefreshCw className="w-8 h-8 text-[var(--primary-500)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-100)]">
                      이미지 재생성
                    </h2>
                    <p className="text-sm text-[var(--text-400)]">
                      어떻게 변경하고 싶으신가요?
                    </p>
                  </div>

                  {/* Character and Dialogue Info */}
                  {regenerateRequest.segment && (
                    <div className="p-4 bg-[var(--bg-700)]/50 border border-[var(--border)] rounded-2xl space-y-2">
                      <div className="text-xs text-[var(--text-400)]">대사</div>
                      <div className="text-sm text-[var(--text-200)]">
                        "{regenerateRequest.segment.dialogue}"
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-[var(--text-200)]">
                      수정 요청사항
                    </label>
                    <textarea
                      value={regenerateRequest.prompt}
                      onChange={(e) =>
                        setRegenerateRequest((prev) => ({
                          ...prev,
                          prompt: e.target.value,
                        }))
                      }
                      placeholder="예: 배경을 더 밝게, 캐릭터 표정을 웃는 얼굴로, 파란색 배경으로 변경 등..."
                      className="w-full min-h-[100px] p-4 bg-[var(--bg-700)] border border-[var(--border)] focus:border-[var(--primary-500)] rounded-2xl text-[var(--text-100)] placeholder:text-[var(--text-500)] focus:outline-none resize-none transition-colors"
                    />
                    <p className="text-xs text-[var(--text-500)]">
                      💡 구체적으로 작성할수록 원하는 결과를 얻을 수 있습니다
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Dialog.Close asChild>
                      <button className="flex-1 px-4 py-3 bg-[var(--bg-700)] hover:bg-[var(--bg-600)] border border-[var(--border)] rounded-xl font-semibold text-[var(--text-200)] transition-all">
                        취소
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={handleRegenerateSubmit}
                      disabled={!regenerateRequest.prompt.trim()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      재생성 요청
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Image Preview Modal */}
      <Dialog.Root
        open={!!selectedImage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null);
            setSelectedImageIndex(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
          <Dialog.Content 
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <Dialog.Title className="sr-only">이미지 미리보기</Dialog.Title>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-800)]/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl"
            >
              <div className="aspect-[9/16] relative">
                <img
                  src={selectedImage?.generated_image_url || ""}
                  alt={selectedImage?.character_name}
                  className="w-full h-full object-cover"
                />
                <Dialog.Close asChild>
                  <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-xl backdrop-blur-sm transition-colors text-white">
                    ✕
                  </button>
                </Dialog.Close>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="text-sm text-[var(--text-400)] mb-1">캐릭터</div>
                  <div className="text-xl font-bold text-[var(--text-100)]">
                    {selectedImage?.character_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-400)] mb-1">대사</div>
                  <div className="text-[var(--text-200)]">
                    "{selectedImage?.dialogue}"
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (selectedImage && selectedImageIndex !== null) {
                        setSelectedImage(null);
                        handleRegenerateClick(selectedImage, selectedImageIndex);
                        setSelectedImageIndex(null);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-[var(--bg-700)] hover:bg-[var(--bg-600)] border border-[var(--border)] rounded-xl font-semibold text-[var(--text-200)] flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    재생성
                  </button>
                  <Dialog.Close asChild>
                    <button className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                      확정
                    </button>
                  </Dialog.Close>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}