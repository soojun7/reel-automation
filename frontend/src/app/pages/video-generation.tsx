import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Smile,
  Type,
  Zap,
  Music,
  Upload,
  X,
  FileText,
  Send,
  PanelRightClose,
  PanelRightOpen
} from "lucide-react";
import * as Progress from "@radix-ui/react-progress";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useProject } from "../contexts/project-context";
import { API_URL } from "../../config";

const emotions = [
  { id: "normal", label: "일반" },
  { id: "happy", label: "기쁨" },
  { id: "kind", label: "상냥함" },
  { id: "excited", label: "신남" },
  { id: "sad", label: "슬픔" },
  { id: "angry", label: "화남" },
];

const fonts = [
  { value: "noto-sans", label: "Noto Sans KR" },
  { value: "roboto", label: "Roboto" },
  { value: "pretendard", label: "Pretendard" },
  { value: "nanumgothic", label: "나눔고딕" },
  { value: "malgun", label: "맑은 고딕" },
];

const transitions = [
  { id: "fade", label: "페이드" },
  { id: "slide", label: "슬라이드" },
  { id: "zoom", label: "줌" },
  { id: "none", label: "없음" },
];

interface SettingToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}

function SettingToggle({ icon: Icon, label, checked, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-[var(--text-200)]">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-11 h-6 bg-[var(--bg-700)] rounded-full relative transition-colors data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[var(--primary-500)] data-[state=checked]:to-[var(--secondary-500)]"
      >
        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px] shadow-lg" />
      </Switch.Root>
    </div>
  );
}

export default function VideoGeneration() {
  const { segments, updateSegment, runId, combinedVideoUrl, setCombinedVideoUrl } = useProject();
  
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<number>>(new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  
  // Local state for UI components
  const [generatingStates, setGeneratingStates] = useState<Record<number, string>>({});
  
  // Regenerate dialog state
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateSegmentId, setRegenerateSegmentId] = useState<number | null>(null);
  const [regenerateInstruction, setRegenerateInstruction] = useState("");

  // Settings state
  const [selectedEmotion, setSelectedEmotion] = useState("normal");
  const [selectedTransition, setSelectedTransition] = useState("fade");
  const [selectedFont, setSelectedFont] = useState("noto-sans");
  const [subtitleSplitMode, setSubtitleSplitMode] = useState<"count" | "meaning">("count");
  const [maxCharacters, setMaxCharacters] = useState(15);
  const [zoomIntensity, setZoomIntensity] = useState(50);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  
  const [settings, setSettings] = useState({
    subtitles: true,
    zoomEffect: true,
    backgroundMusic: false,
  });

  useEffect(() => {
    // Determine if we need to generate videos
    const needsGeneration = segments.some(s => !s.generated_video_url);
    if (!needsGeneration && combinedVideoUrl) {
      setIsComplete(true);
      return;
    }

    const generateVideos = async () => {
      let completed = 0;
      const total = segments.filter(s => !s.generated_video_url).length;

      // 로컬에서 video URL 추적 (React 상태 업데이트 비동기 문제 해결)
      const generatedVideoUrls: Record<number, string> = {};

      // 기존에 생성된 URL도 추가
      segments.forEach((seg, i) => {
        if (seg.generated_video_url) {
          generatedVideoUrls[i] = seg.generated_video_url;
        }
      });

      // 모든 세그먼트 동시 생성 시작 표시
      segments.forEach((seg, i) => {
        if (!seg.generated_video_url) {
          setGeneratingStates(prev => ({ ...prev, [i]: "generating" }));
        }
      });

      // 병렬 처리
      const promises = segments.map(async (seg, i) => {
        if (seg.generated_video_url) return; // 이미 생성된 건 스킵

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3분 타임아웃

          const res = await fetch(`${API_URL}/api/generate-video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              segment_index: i,
              character_name: seg.character_name,
              video_prompt: seg.video_prompt,
              image_url: seg.runware_url,
              run_id: runId,
              dialogue: seg.dialogue,  // 대사 길이에 따라 영상 길이 조절
              emotion: seg.emotion || "normal"  // 캐릭터별 감정 (목소리 톤 반영)
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data = await res.json();
          if (data.video_url) {
            // Runware CDN URL 직접 사용
            generatedVideoUrls[i] = data.video_url;  // 로컬 추적
            updateSegment(i, { generated_video_url: data.video_url });
            setGeneratingStates(prev => ({ ...prev, [i]: "completed" }));
          } else {
            setGeneratingStates(prev => ({ ...prev, [i]: "error" }));
          }
        } catch (e: any) {
          console.error(`Video generation failed for segment ${i}:`, e);
          setGeneratingStates(prev => ({ ...prev, [i]: "error" }));
        }

        completed++;
        setProgress((completed / total) * 100);
      });

      await Promise.all(promises);

      // 영상 합치기 (R2 스토리지 사용)
      try {
        // 로컬에서 추적한 video URL 사용 (React 상태 비동기 문제 해결)
        const videoUrls = segments
          .map((_, i) => generatedVideoUrls[i])
          .filter(Boolean);

        console.log(`[combine] Video URLs to combine: ${videoUrls.length}`, videoUrls);

        if (videoUrls.length > 0) {
          const res = await fetch(`${API_URL}/api/combine-videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              video_urls: videoUrls,
              run_id: runId
            })
          });
          const data = await res.json();
          if (data.video_url) {
            setCombinedVideoUrl(data.video_url);
          } else {
            console.error("[combine] No video_url in response", data);
          }
        }
      } catch (e) {
        console.error("Combine failed", e);
      }

      setIsComplete(true);
    };

    generateVideos();
  }, [segments, runId, combinedVideoUrl]);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
    }
  };

  const handleIndividualDownload = () => {
    toast.success("개별 영상 다운로드를 시작합니다.");
    // Implement actual download logic here if needed
  };

  const handleCombinedDownload = () => {
    if (combinedVideoUrl) {
      window.open(combinedVideoUrl, "_blank");
      toast.success("통합 영상 다운로드를 시작합니다.");
    }
  };

  const toggleMute = (id: number) => {
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openRegenerateDialog = (segmentId: number | null) => {
    setRegenerateSegmentId(segmentId);
    setRegenerateInstruction("");
    setRegenerateDialogOpen(true);
  };

  const handleSubmitRegenerate = () => {
    if (regenerateSegmentId === null) {
      toast.success("통합 영상 재생성을 시작합니다.");
    } else {
      const segment = segments[regenerateSegmentId];
      toast.success(`${segment?.character_name} 영상을 재생성합니다.`);
    }
    setRegenerateDialogOpen(false);
    setRegenerateInstruction("");
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />;
      case "generating":
        return (
          <div className="w-6 h-6 border-3 border-[var(--primary-500)]/30 border-t-[var(--primary-500)] rounded-full animate-spin" />
        );
      case "waiting":
        return <Clock className="w-6 h-6 text-[var(--text-400)]" />;
      case "error":
        return <div className="w-6 h-6 text-[var(--error)]">✕</div>;
      default:
        return <Clock className="w-6 h-6 text-[var(--text-400)]" />;
    }
  };

  const getStatus = (index: number) => {
    if (segments[index].generated_video_url) return "completed";
    return generatingStates[index] || "waiting";
  };

  const completedCount = segments.filter(s => !!s.generated_video_url).length;

  if (!isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl space-y-12"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 mb-6"
            >
              <Loader2 className="w-10 h-10 text-[var(--primary-500)] animate-spin" />
            </motion.div>
            <h1 className="text-5xl font-bold text-[var(--text-100)] tracking-tight">
              영상 생성 중
            </h1>
            <p className="text-xl text-[var(--text-400)]">
              AI가 각 이미지를 영상으로 변환하고 있습니다
            </p>
          </div>

          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-20" />
            
            <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 shadow-2xl space-y-6">
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-[var(--text-200)]">
                    진행 상황
                  </span>
                  <span className="font-bold text-[var(--primary-500)]">
                    {completedCount}/{segments.length}
                  </span>
                </div>
                <Progress.Root
                  className="relative overflow-hidden bg-[var(--bg-700)] rounded-full h-4 shadow-inner"
                  value={progress}
                >
                  <Progress.Indicator
                    className="bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] h-full transition-transform duration-500 ease-out rounded-full shadow-lg relative overflow-hidden"
                    style={{ transform: `translateX(-${100 - progress}%)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </Progress.Indicator>
                </Progress.Root>
                <div className="text-center">
                  <span className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] bg-clip-text text-transparent">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              {/* Segments Grid */}
              <div className="grid grid-cols-2 gap-4">
                {segments.map((segment, index) => {
                  const status = getStatus(index);
                  return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-2xl border transition-all ${
                      status === "completed"
                        ? "bg-[var(--success)]/10 border-[var(--success)]/30 shadow-lg shadow-[var(--success)]/10"
                        : status === "generating"
                        ? "bg-[var(--primary-500)]/10 border-[var(--primary-500)]/30 shadow-lg shadow-[var(--primary-500)]/10"
                        : "bg-[var(--bg-700)] border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={status} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[var(--text-100)] truncate">
                          {segment.character_name}
                        </div>
                        <div className="text-xs text-[var(--text-400)] mt-0.5">
                          {status === "completed"
                            ? "✓ 완료"
                            : status === "generating"
                            ? "생성 중..."
                            : status === "error"
                            ? "실패"
                            : "대기 중"}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )})}
              </div>

              {/* Estimated Time */}
              <div className="flex items-center justify-center gap-2 text-[var(--text-400)] pt-4 border-t border-[var(--border)]">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">예상 소요 시간: ~3분</span>
              </div>
            </div>
          </motion.div>

          {/* Loading Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-full blur-2xl opacity-30" />
              <div className="relative text-6xl">🎬</div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Complete state - video list with scripts
  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        onAnimationComplete={() => {
          toast.success("모든 영상이 성공적으로 생성되었습니다!", {
            description: "이제 영상을 다운로드하거나 설정을 변경할 수 있습니다.",
            duration: 4000,
          });
        }}
        className="max-w-[1800px] mx-auto"
      >
        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${isPanelOpen ? 'mr-0' : 'mr-0'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[var(--primary-500)]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-100)]">
                    영상 생성 완료
                  </h1>
                  <p className="text-sm text-[var(--text-400)]">
                    생성된 영상을 확인하고 다운로드하세요
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="px-4 py-2 bg-[var(--bg-800)] border border-[var(--border)] text-[var(--text-100)] font-medium rounded-xl hover:bg-[var(--bg-700)] transition-all flex items-center gap-2"
              >
                {isPanelOpen ? (
                  <>
                    <PanelRightClose className="w-4 h-4" />
                    설정 패널 닫기
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4" />
                    설정 패널 열기
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleIndividualDownload}
                className="px-5 py-2.5 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl shadow-lg shadow-[var(--primary-500)]/30 hover:-translate-y-0.5 transition-all hover:shadow-[var(--primary-500)]/50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                개별 영상 다운로드
              </button>
              <button
                onClick={handleCombinedDownload}
                className="px-5 py-2.5 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl shadow-lg shadow-[var(--primary-500)]/30 hover:-translate-y-0.5 transition-all hover:shadow-[var(--primary-500)]/50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                통합 영상 다운로드
              </button>
            </div>

            {/* Combined Video Section */}
            {combinedVideoUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-[var(--text-100)]">통합 영상</h2>
                <span className="text-sm text-[var(--text-400)]">모든 장면이 하나로 합쳐진 완성 영상</span>
              </div>

              <div className="bg-[var(--bg-800)] border-2 border-[var(--primary-500)]/30 rounded-2xl overflow-hidden">
                <div className="flex gap-6 p-6">
                  {/* Vertical Video Preview */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-[280px] h-[498px] bg-[var(--bg-700)] rounded-xl overflow-hidden">
                      <video 
                        src={combinedVideoUrl} 
                        className="w-full h-full object-cover"
                        controls={playingId === 0}
                        autoPlay={playingId === 0}
                        muted={mutedVideos.has(0)}
                      />
                      
                      {/* Play Overlay */}
                      {playingId !== 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPlayingId(0)}
                          className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Play className="w-8 h-8 text-black ml-1" />
                        </button>
                      </div>
                      )}

                      {/* Duration Badge */}
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-lg">
                        <span className="text-xs font-semibold text-white">{segments.length}개 장면</span>
                      </div>

                      {/* Mute Button */}
                      <button
                        onClick={() => toggleMute(0)}
                        className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {mutedVideos.has(0) ? (
                          <VolumeX className="w-4 h-4 text-white" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Combined Script & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-400)] mb-2">전체 대본</div>
                      <div className="text-sm text-[var(--text-200)] leading-relaxed max-h-[400px] overflow-y-auto pr-2">
                        {segments.map((seg, idx) => (
                          <p key={idx} className="mb-3">
                            <span className="font-semibold text-[var(--primary-500)]">{seg.character_name}:</span> {seg.dialogue}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openRegenerateDialog(null)}
                        className="px-4 py-2.5 bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-100)] font-medium rounded-xl hover:bg-[var(--bg-600)] transition-all flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        통합 영상 재생성
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            )}

            {/* Individual Videos Title */}
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-[var(--text-100)]">개별 영상</h2>
              <span className="text-sm text-[var(--text-400)]">{segments.length}개 영상</span>
            </div>

            {/* Video List */}
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[var(--bg-800)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--primary-500)]/30 transition-all"
                >
                  <div className="flex gap-6 p-6">
                    {/* Vertical Video Preview */}
                    <div className="relative group flex-shrink-0">
                      <div className="w-[200px] h-[356px] bg-[var(--bg-700)] rounded-xl overflow-hidden">
                        <video 
                          src={segment.generated_video_url} 
                          className="w-full h-full object-cover"
                          controls={playingId === index + 1}
                          autoPlay={playingId === index + 1}
                          muted={mutedVideos.has(index + 1)}
                        />
                        
                        {/* Play Overlay */}
                        {playingId !== index + 1 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPlayingId(index + 1)}
                            className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Play className="w-6 h-6 text-black ml-1" />
                          </button>
                        </div>
                        )}

                        {/* Mute Button */}
                        <button
                          onClick={() => toggleMute(index + 1)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {mutedVideos.has(index + 1) ? (
                            <VolumeX className="w-4 h-4 text-white" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-white" />
                          )}
                        </button>

                        {/* Segment Number */}
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/80 backdrop-blur-sm rounded-lg">
                          <span className="text-xs font-semibold text-white">#{index + 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Script & Actions */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text-100)] mb-2">{segment.character_name}</h3>
                        <div className="flex items-start gap-2 mb-3">
                          <FileText className="w-4 h-4 text-[var(--text-400)] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-[var(--text-200)] leading-relaxed">{segment.dialogue}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openRegenerateDialog(index)}
                          className="px-4 py-2 bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-100)] font-medium rounded-xl hover:bg-[var(--bg-600)] transition-all flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          재생성
                        </button>
                        <button
                          onClick={() => {
                            if (segment.generated_video_url) {
                              window.open(segment.generated_video_url, "_blank");
                            }
                          }}
                          className="px-4 py-2 bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-100)] font-medium rounded-xl hover:bg-[var(--bg-600)] transition-all flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          다운로드
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Panel - Collapsible Settings */}
          <AnimatePresence>
            {isPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 384, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="w-96 sticky top-8">
                  <div className="bg-[var(--bg-800)] border border-[var(--border)] rounded-2xl p-6 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-[var(--text-100)]">영상 설정</h2>
                      <button
                        onClick={() => setIsPanelOpen(false)}
                        className="w-8 h-8 rounded-lg hover:bg-[var(--bg-700)] flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-[var(--text-400)]" />
                      </button>
                    </div>

                    {/* Emotion Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[var(--text-200)]">
                        <Smile className="w-5 h-5 text-[var(--primary-500)]" />
                        <h3 className="font-semibold">감정 설정</h3>
                      </div>
                      
                      <select
                        value={selectedEmotion}
                        onChange={(e) => setSelectedEmotion(e.target.value)}
                        className="w-full p-3 bg-[var(--bg-700)] border border-[var(--border)] rounded-xl text-[var(--text-100)] focus:outline-none focus:border-[var(--primary-500)] transition-colors"
                      >
                        {emotions.map((emotion) => (
                          <option key={emotion.id} value={emotion.id}>
                            {emotion.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Video Effects */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[var(--text-200)]">
                        <Zap className="w-5 h-5 text-[var(--primary-500)]" />
                        <h3 className="font-semibold">영상 효과</h3>
                      </div>

                      <div className="space-y-2">
                        <SettingToggle
                          icon={Type}
                          label="자막"
                          checked={settings.subtitles}
                          onCheckedChange={() => handleToggle("subtitles")}
                        />
                        <SettingToggle
                          icon={Zap}
                          label="줌 효과"
                          checked={settings.zoomEffect}
                          onCheckedChange={() => handleToggle("zoomEffect")}
                        />
                        <SettingToggle
                          icon={Music}
                          label="배경음악"
                          checked={settings.backgroundMusic}
                          onCheckedChange={() => handleToggle("backgroundMusic")}
                        />
                      </div>
                    </div>

                    {/* Subtitle Settings */}
                    <AnimatePresence>
                      {settings.subtitles && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-[var(--border)]"
                        >
                          <div className="text-sm font-semibold text-[var(--text-200)]">자막 설정</div>
                          
                          <div>
                            <label className="text-xs text-[var(--text-400)] mb-2 block">폰트</label>
                            <select
                              value={selectedFont}
                              onChange={(e) => setSelectedFont(e.target.value)}
                              className="w-full p-2.5 bg-[var(--bg-700)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-100)] focus:outline-none focus:border-[var(--primary-500)]"
                            >
                              {fonts.map((font) => (
                                <option key={font.value} value={font.value}>
                                  {font.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-[var(--text-400)] mb-2 block">분할 기준</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSubtitleSplitMode("count")}
                                className={`flex-1 p-2 rounded-lg text-xs font-medium transition-all ${
                                  subtitleSplitMode === "count"
                                    ? "bg-[var(--primary-500)]/20 border border-[var(--primary-500)] text-[var(--text-100)]"
                                    : "bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-400)]"
                                }`}
                              >
                                글자수
                              </button>
                              <button
                                onClick={() => setSubtitleSplitMode("meaning")}
                                className={`flex-1 p-2 rounded-lg text-xs font-medium transition-all ${
                                  subtitleSplitMode === "meaning"
                                    ? "bg-[var(--primary-500)]/20 border border-[var(--primary-500)] text-[var(--text-100)]"
                                    : "bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-400)]"
                                }`}
                              >
                                의미
                              </button>
                            </div>
                          </div>

                          {subtitleSplitMode === "count" && (
                            <div>
                              <label className="text-xs text-[var(--text-400)] mb-2 block">
                                최대 글자수: {maxCharacters}
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="30"
                                value={maxCharacters}
                                onChange={(e) => setMaxCharacters(Number(e.target.value))}
                                className="w-full"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Zoom Effect Settings */}
                    <AnimatePresence>
                      {settings.zoomEffect && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-[var(--border)]"
                        >
                          <div className="text-sm font-semibold text-[var(--text-200)]">줌 효과 설정</div>
                          
                          <div>
                            <label className="text-xs text-[var(--text-400)] mb-2 block">
                              줌 강도: {zoomIntensity}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={zoomIntensity}
                              onChange={(e) => setZoomIntensity(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Background Music */}
                    <AnimatePresence>
                      {settings.backgroundMusic && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 pt-3 border-t border-[var(--border)]"
                        >
                          <div className="text-sm font-semibold text-[var(--text-200)]">배경음악</div>
                          
                          <label className="block">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <div className="w-full p-4 border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-500)] transition-colors cursor-pointer text-center">
                              <Upload className="w-6 h-6 text-[var(--text-400)] mx-auto mb-2" />
                              <div className="text-sm text-[var(--text-300)]">
                                {musicFile ? musicFile.name : "음악 파일 업로드"}
                              </div>
                            </div>
                          </label>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Transition Effect */}
                    <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                      <div className="text-sm font-semibold text-[var(--text-200)]">장면 전환 효과</div>
                      
                      <select
                        value={selectedTransition}
                        onChange={(e) => setSelectedTransition(e.target.value)}
                        className="w-full p-2.5 bg-[var(--bg-700)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-100)] focus:outline-none focus:border-[var(--primary-500)]"
                      >
                        {transitions.map((transition) => (
                          <option key={transition.id} value={transition.id}>
                            {transition.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Regenerate Dialog */}
      <Dialog.Root open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--bg-800)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl z-50">
            <Dialog.Title className="text-xl font-bold text-[var(--text-100)] mb-2">
              {regenerateSegmentId === null ? "통합 영상 재생성" : `${segments[regenerateSegmentId]?.character_name} 재생성`}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--text-400)] mb-4">
              추가 지시사항을 입력하여 영상을 재생성할 수 있습니다.
            </Dialog.Description>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--text-200)] mb-2 block">
                  지시사항 (선택사항)
                </label>
                <textarea
                  value={regenerateInstruction}
                  onChange={(e) => setRegenerateInstruction(e.target.value)}
                  placeholder="예: 더 밝은 톤으로, 배경을 파란색으로 변경 등..."
                  className="w-full h-32 p-3 bg-[var(--bg-700)] border border-[var(--border)] rounded-xl text-[var(--text-100)] placeholder:text-[var(--text-400)] focus:outline-none focus:border-[var(--primary-500)] resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 bg-[var(--bg-700)] border border-[var(--border)] text-[var(--text-100)] font-medium rounded-xl hover:bg-[var(--bg-600)] transition-all">
                    취소
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleSubmitRegenerate}
                  className="px-4 py-2 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--primary-500)]/30 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  재생성 시작
                </button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-[var(--bg-700)] flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[var(--text-400)]" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
