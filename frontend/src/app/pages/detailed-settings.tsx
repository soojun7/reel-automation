import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Smile, Frown, Meh, Heart, PartyPopper, Type, Zap, Music, ArrowRight, Upload, X, Eye, Maximize, Minimize, Image as ImageIcon } from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import { useProject } from "../contexts/project-context";

const emotions = [
  { id: "normal", label: "일반", icon: Meh, color: "from-gray-400 to-gray-500" },
  { id: "happy", label: "기쁨", icon: Smile, color: "from-yellow-400 to-orange-400" },
  { id: "kind", label: "상냥함", icon: Heart, color: "from-pink-400 to-rose-400" },
  { id: "excited", label: "신남", icon: PartyPopper, color: "from-purple-400 to-pink-400" },
  { id: "sad", label: "슬픔", icon: Frown, color: "from-blue-400 to-indigo-400" },
  { id: "angry", label: "화남", icon: Zap, color: "from-red-400 to-orange-600" },
];

const transitions = [
  { id: "fade", label: "페이드", description: "부드러운 전환" },
  { id: "slide", label: "슬라이드", description: "좌우 슬라이드" },
  { id: "zoom", label: "줌", description: "확대/축소 전환" },
  { id: "none", label: "없음", description: "즉시 전환" },
];

const subtitleStyles = [
  { id: "modern", label: "모던", description: "깔끔한 스타일" },
  { id: "bold", label: "볼드", description: "강조된 텍스트" },
  { id: "neon", label: "네온", description: "화려한 효과" },
  { id: "minimal", label: "미니멀", description: "심플한 스타일" },
];

const fonts = [
  { value: "noto-sans", label: "Noto Sans KR" },
  { value: "roboto", label: "Roboto" },
  { value: "pretendard", label: "Pretendard" },
  { value: "nanumgothic", label: "나눔고딕" },
  { value: "malgun", label: "맑은 고딕" },
];

export default function DetailedSettings() {
  const navigate = useNavigate();
  const { styleId, segments, updateSegment, globalEmotion, setGlobalEmotion } = useProject();
  const [selectedTransition, setSelectedTransition] = useState("fade");
  const [selectedSubtitleStyle, setSelectedSubtitleStyle] = useState("modern");
  const [selectedFont, setSelectedFont] = useState("noto-sans");
  const [subtitleSplitMode, setSubtitleSplitMode] = useState<"count" | "meaning">("count");
  const [maxCharacters, setMaxCharacters] = useState(15);
  const [zoomIntensity, setZoomIntensity] = useState(50);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [settings, setSettings] = useState({
    subtitles: true,
    zoomEffect: true,
    backgroundMusic: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
    }
  };

  const handleNext = () => {
    navigate("/images");
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto space-y-12"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 mb-6"
          >
            <Settings className="w-10 h-10 text-[var(--primary-500)]" />
          </motion.div>
          <h1 className="text-5xl font-bold text-[var(--text-100)] tracking-tight">
            상세 설정
          </h1>
          <p className="text-xl text-[var(--text-400)]">
            영상의 감정과 효과를 세밀하게 조정하세요
          </p>
        </div>

        {/* Settings Container */}
        <div className="space-y-8">
          {/* Emotion Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-10" />
            
            <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                  <Smile className="w-6 h-6 text-[var(--primary-500)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-100)]">감정 설정</h2>
                  <p className="text-sm text-[var(--text-400)]">캐릭터의 전체적인 감정 톤을 선택하세요</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {emotions.map((emotion) => {
                  const Icon = emotion.icon;
                  const isSelected = globalEmotion === emotion.id;
                  return (
                    <button
                      key={emotion.id}
                      onClick={() => setGlobalEmotion(emotion.id)}
                      className={`p-6 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10 shadow-lg shadow-[var(--primary-500)]/20"
                          : "border-[var(--border)] bg-[var(--bg-700)]/50 hover:border-[var(--primary-400)] hover:bg-[var(--bg-700)]"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${emotion.color} flex items-center justify-center mb-3 mx-auto`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-[var(--text-100)]">{emotion.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Video Effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-10" />
            
            <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[var(--primary-500)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-100)]">영상 효과</h2>
                  <p className="text-sm text-[var(--text-400)]">영상에 적용할 효과를 설정하세요</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Toggle Options */}
                <div className="space-y-4">
                  <SettingToggle
                    icon={Type}
                    label="자막"
                    description="화면에 자막 표시"
                    checked={settings.subtitles}
                    onCheckedChange={() => handleToggle("subtitles")}
                  />
                  <SettingToggle
                    icon={Zap}
                    label="줌 인/아웃 효과"
                    description="동적인 확대/축소 효과"
                    checked={settings.zoomEffect}
                    onCheckedChange={() => handleToggle("zoomEffect")}
                  />
                  <SettingToggle
                    icon={Music}
                    label="배경음악"
                    description="영상에 배경음악 추가"
                    checked={settings.backgroundMusic}
                    onCheckedChange={() => handleToggle("backgroundMusic")}
                  />
                </div>

                {/* Subtitle Details Panel */}
                <AnimatePresence>
                  {settings.subtitles && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-6 bg-[var(--bg-700)]/50 border border-[var(--border)] rounded-2xl space-y-6">
                        <div className="text-sm font-semibold text-[var(--text-200)] mb-4">자막 상세 설정</div>
                        
                        {/* Font Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--text-300)]">폰트</label>
                          <select
                            value={selectedFont}
                            onChange={(e) => setSelectedFont(e.target.value)}
                            className="w-full p-3 bg-[var(--bg-800)] border border-[var(--border)] rounded-xl text-[var(--text-100)] focus:outline-none focus:border-[var(--primary-500)] transition-colors"
                          >
                            {fonts.map((font) => (
                              <option key={font.value} value={font.value}>
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Split Mode */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-[var(--text-300)]">자막 분할 기준</label>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setSubtitleSplitMode("count")}
                              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                subtitleSplitMode === "count"
                                  ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--text-100)]"
                                  : "border-[var(--border)] bg-[var(--bg-800)] text-[var(--text-400)]"
                              }`}
                            >
                              글자수 기준
                            </button>
                            <button
                              onClick={() => setSubtitleSplitMode("meaning")}
                              className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                subtitleSplitMode === "meaning"
                                  ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--text-100)]"
                                  : "border-[var(--border)] bg-[var(--bg-800)] text-[var(--text-400)]"
                              }`}
                            >
                              의미 기준
                            </button>
                          </div>
                        </div>

                        {/* Character Count */}
                        {subtitleSplitMode === "count" && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-[var(--text-300)]">최대 글자수</label>
                              <span className="text-sm font-semibold text-[var(--primary-500)]">{maxCharacters}자</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="30"
                              value={maxCharacters}
                              onChange={(e) => setMaxCharacters(Number(e.target.value))}
                              className="w-full h-2 bg-[var(--bg-800)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[var(--primary-500)] [&::-webkit-slider-thumb]:to-[var(--secondary-500)]"
                            />
                          </div>
                        )}

                        {/* Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-300)]">
                            <Eye className="w-4 h-4" />
                            미리보기
                          </div>
                          <div className="relative aspect-video bg-[var(--bg-800)] rounded-xl overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-500)]/5 to-[var(--secondary-500)]/5" />
                            <div
                              className={`relative px-6 py-3 rounded-xl ${
                                selectedSubtitleStyle === "modern"
                                  ? "bg-black/80 text-white"
                                  : selectedSubtitleStyle === "bold"
                                  ? "bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-bold"
                                  : selectedSubtitleStyle === "neon"
                                  ? "bg-black text-[var(--primary-500)] border-2 border-[var(--primary-500)] shadow-lg shadow-[var(--primary-500)]/50"
                                  : "bg-white/90 text-black"
                              }`}
                              style={{ fontFamily: selectedFont === "noto-sans" ? "Noto Sans KR" : "inherit" }}
                            >
                              나 루테인이야!
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Zoom Effect Panel */}
                <AnimatePresence>
                  {settings.zoomEffect && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-6 bg-[var(--bg-700)]/50 border border-[var(--border)] rounded-2xl space-y-4">
                        <div className="text-sm font-semibold text-[var(--text-200)] mb-4">줌 효과 상세 설정</div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-300)]">줌 강도</label>
                            <span className="text-sm font-semibold text-[var(--primary-500)]">{zoomIntensity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={zoomIntensity}
                            onChange={(e) => setZoomIntensity(Number(e.target.value))}
                            className="w-full h-2 bg-[var(--bg-800)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[var(--primary-500)] [&::-webkit-slider-thumb]:to-[var(--secondary-500)]"
                          />
                          <div className="flex justify-between text-xs text-[var(--text-500)]">
                            <span>약함</span>
                            <span>강함</span>
                          </div>
                        </div>

                        {/* Zoom Preview */}
                        <div className="relative aspect-video bg-[var(--bg-800)] rounded-xl overflow-hidden flex items-center justify-center">
                          <motion.div
                            animate={{
                              scale: [1, 1 + (zoomIntensity / 100) * 0.3, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] flex items-center justify-center"
                          >
                            <Maximize className="w-12 h-12 text-white" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Background Music Panel */}
                <AnimatePresence>
                  {settings.backgroundMusic && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-6 bg-[var(--bg-700)]/50 border border-[var(--border)] rounded-2xl space-y-4">
                        <div className="text-sm font-semibold text-[var(--text-200)] mb-4">배경음악 업로드</div>
                        
                        {!musicFile ? (
                          <div
                            onDrop={handleDrop}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
                              isDragging
                                ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10"
                                : "border-[var(--border)] bg-[var(--bg-800)] hover:border-[var(--primary-400)]"
                            }`}
                          >
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-[var(--primary-500)]" />
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-[var(--text-100)]">음악 파일 업로드</p>
                                <p className="text-sm text-[var(--text-400)] mt-1">
                                  파일을 드래그하거나 클릭하여 선택하세요
                                </p>
                                <p className="text-xs text-[var(--text-500)] mt-2">
                                  MP3, WAV, M4A 파일 지원
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-4 bg-[var(--bg-800)] border border-[var(--border)] rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                                <Music className="w-5 h-5 text-[var(--primary-500)]" />
                              </div>
                              <div>
                                <p className="font-semibold text-[var(--text-100)] text-sm">{musicFile.name}</p>
                                <p className="text-xs text-[var(--text-400)]">
                                  {(musicFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setMusicFile(null)}
                              className="w-8 h-8 rounded-lg bg-[var(--bg-700)] hover:bg-red-500/20 border border-[var(--border)] hover:border-red-500 flex items-center justify-center transition-colors group"
                            >
                              <X className="w-4 h-4 text-[var(--text-400)] group-hover:text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Logo / Brand Domain Verification (Personification only) */}
          {styleId === "personification" && segments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-10" />
              
              <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-[var(--primary-500)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-100)]">로고(원본) 확인 및 수정</h2>
                    <p className="text-sm text-[var(--text-400)]">의인화할 대상의 로고 도메인이나 직접 이미지를 등록하세요.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {segments.map((seg, index) => (
                    <div key={index} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-700)]/50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-[var(--text-100)] text-lg">{index + 1}. {seg.character_name}</div>
                        <div className="flex items-center gap-3 bg-[var(--bg-800)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                          <span className="text-sm font-medium text-[var(--text-300)]">로고 캐릭터</span>
                          <Switch.Root 
                            checked={seg.is_logo || false} 
                            onCheckedChange={(checked) => {
                              updateSegment(index, { 
                                is_logo: checked,
                                // Clear data when turning off
                                ...(checked ? {} : { seed_image_url: null, seed_image_data: null, brand_domain: "" })
                              });
                            }} 
                            className={`relative w-10 h-6 rounded-full transition-colors ${
                              seg.is_logo ? "bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)]" : "bg-[var(--bg-600)]"
                            }`}
                          >
                            <Switch.Thumb className={`block w-4 h-4 bg-white rounded-full transition-transform shadow-lg ${
                              seg.is_logo ? "translate-x-5" : "translate-x-1"
                            }`} />
                          </Switch.Root>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {seg.is_logo && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 mt-4 overflow-hidden"
                          >
                            <div 
                              className="relative flex items-center gap-4 p-4 border-2 border-dashed border-[var(--border)] rounded-xl hover:border-[var(--primary-400)] bg-[var(--bg-800)]/50 transition-colors"
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files[0];
                                if (file && file.type.startsWith("image/")) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    updateSegment(index, { seed_image_data: reader.result as string, seed_image_url: null, brand_domain: "" });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            >
                              <div className="w-16 h-16 rounded-xl bg-[var(--bg-800)] border border-[var(--border)] flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {seg.seed_image_data ? (
                                  <img src={seg.seed_image_data} alt="custom" className="w-full h-full object-cover" />
                                ) : seg.seed_image_url ? (
                                  <img src={seg.seed_image_url} alt="domain logo" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-[var(--text-500)]" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2 min-w-0">
                                <p className="text-xs text-[var(--text-300)] hidden sm:block">이미지를 이곳에 드래그하거나 아래 버튼으로 업로드하세요</p>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  className="block w-full text-xs text-[var(--text-400)] file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--primary-500)]/10 file:text-[var(--primary-500)] hover:file:bg-[var(--primary-500)]/20 cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        updateSegment(index, { seed_image_data: reader.result as string, seed_image_url: null, brand_domain: "" });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="text-xs font-semibold text-[var(--text-400)] whitespace-nowrap">또는 URL 입력:</div>
                              <input 
                                type="text" 
                                placeholder="이미지 URL 또는 도메인 (예: google.com)"
                                value={seg.brand_domain || ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const isUrl = val.startsWith("http");
                                  updateSegment(index, { 
                                    brand_domain: val, 
                                    seed_image_url: isUrl ? val : (val ? `https://www.google.com/s2/favicons?domain=${val}&sz=256` : null),
                                    seed_image_data: null 
                                  });
                                }}
                                className="flex-1 p-2.5 bg-[var(--bg-800)] border border-[var(--border)] rounded-xl text-[var(--text-100)] text-sm focus:outline-none focus:border-[var(--primary-500)] transition-colors"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Transition Effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-10" />
            
            <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[var(--primary-500)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-100)]">전환 효과</h2>
                  <p className="text-sm text-[var(--text-400)]">장면 전환 스타일을 선택하세요</p>
                </div>
              </div>

              <RadioGroup.Root
                value={selectedTransition}
                onValueChange={setSelectedTransition}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {transitions.map((transition) => (
                  <RadioGroup.Item
                    key={transition.id}
                    value={transition.id}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group/item ${
                      selectedTransition === transition.id
                        ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10"
                        : "border-[var(--border)] bg-[var(--bg-700)]/50 hover:border-[var(--primary-400)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-all ${
                        selectedTransition === transition.id
                          ? "border-[var(--primary-500)] bg-[var(--primary-500)]"
                          : "border-[var(--border)] bg-transparent"
                      }`}>
                        {selectedTransition === transition.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--text-100)]">{transition.label}</div>
                        <div className="text-sm text-[var(--text-400)] mt-1">{transition.description}</div>
                      </div>
                    </div>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            </div>
          </motion.div>

          {/* Subtitle Style */}
          {settings.subtitles && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-10" />
              
              <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
                    <Type className="w-6 h-6 text-[var(--primary-500)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-100)]">자막 스타일</h2>
                    <p className="text-sm text-[var(--text-400)]">자막 디자인을 선택하세요</p>
                  </div>
                </div>

                <RadioGroup.Root
                  value={selectedSubtitleStyle}
                  onValueChange={setSelectedSubtitleStyle}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {subtitleStyles.map((style) => (
                    <RadioGroup.Item
                      key={style.id}
                      value={style.id}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedSubtitleStyle === style.id
                          ? "border-[var(--primary-500)] bg-[var(--primary-500)]/10 shadow-lg shadow-[var(--primary-500)]/20"
                          : "border-[var(--border)] bg-[var(--bg-700)]/50 hover:border-[var(--primary-400)]"
                      }`}
                    >
                      <div className="text-center space-y-2">
                        <div className="font-semibold text-[var(--text-100)]">{style.label}</div>
                        <div className="text-xs text-[var(--text-400)]">{style.description}</div>
                      </div>
                    </RadioGroup.Item>
                  ))}
                </RadioGroup.Root>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center pt-8"
        >
          <button
            onClick={handleNext}
            className="px-8 py-4 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-[var(--primary-500)]/30 hover:-translate-y-1 transition-all hover:shadow-[var(--primary-500)]/50 flex items-center gap-2"
          >
            다음 단계
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

interface SettingToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingToggle({ icon: Icon, label, description, checked, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-700)]/30 border border-[var(--border)] hover:bg-[var(--bg-700)]/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-700)] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--primary-500)]" />
        </div>
        <div>
          <div className="font-semibold text-[var(--text-100)]">{label}</div>
          <div className="text-sm text-[var(--text-400)]">{description}</div>
        </div>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          checked ? "bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)]" : "bg-[var(--bg-600)]"
        }`}
      >
        <Switch.Thumb
          className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-lg ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </Switch.Root>
    </div>
  );
}