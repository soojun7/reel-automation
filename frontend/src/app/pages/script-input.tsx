import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, Wand2 } from "lucide-react";
import { motion } from "motion/react";
import { useProject } from "../contexts/project-context";
import { API_URL } from "../../config";

export default function ScriptInput() {
  const navigate = useNavigate();
  const { styleId, scriptText, setScriptText, globalContext, setGlobalContext, setSegments, setRunId } = useProject();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!scriptText.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_text: scriptText,
          style_id: styleId || "personification",
          global_context: globalContext || ""
        }),
      });

      if (!response.ok) throw new Error("분석 실패");

      const data = await response.json();
      setRunId(data.run_id);
      setSegments(data.segments);
      
      // Go to image review/settings
      navigate("/detailed-settings");
    } catch (err) {
      console.error(err);
      alert("대본 분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl space-y-8"
      >
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 backdrop-blur-xl border border-[var(--primary-500)]/30 mb-6"
          >
            <Sparkles className="w-10 h-10 text-[var(--primary-500)]" />
          </motion.div>
          <h1 className="text-5xl font-bold text-[var(--text-100)] tracking-tight">
            대본 입력
          </h1>
          <p className="text-xl text-[var(--text-400)]">
            영상에 사용할 대본을 입력하면 AI가 자동으로 영상을 생성합니다
          </p>
        </div>

        {/* Main Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />

          <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl">
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="캐릭터: 대사 형식으로 입력하세요..."
              className="w-full min-h-[400px] p-8 bg-transparent text-[var(--text-100)] text-lg placeholder:text-[var(--text-500)] focus:outline-none resize-none"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-4">
              <span className="text-sm text-[var(--text-400)] font-medium">
                {scriptText.length} 자
              </span>
            </div>
          </div>
        </motion.div>

        {/* Global Context / Reference Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="relative group"
        >
          <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-700)]/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <h3 className="font-semibold text-[var(--text-200)]">참고사항 (선택)</h3>
              </div>
              <p className="text-xs text-[var(--text-400)] mt-1">
                배경, 분위기, 스타일 등 모든 이미지에 공통 적용할 참고사항을 입력하세요
              </p>
            </div>
            <textarea
              value={globalContext}
              onChange={(e) => setGlobalContext(e.target.value)}
              placeholder="예: 배경은 냉장고 안, 각 캐릭터마다 다른 구도와 앵글로 표현, 귀여운 의인화 스타일..."
              className="w-full min-h-[100px] p-6 bg-transparent text-[var(--text-100)] placeholder:text-[var(--text-500)] focus:outline-none resize-none"
            />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!scriptText.trim() || isAnalyzing}
            className="group relative px-12 py-6 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] rounded-2xl transition-all hover:shadow-2xl hover:shadow-[var(--primary-500)]/30 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden w-full max-w-md"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-center gap-3">
              {isAnalyzing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-xl font-bold text-white">
                    AI 분석 중...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 text-white" />
                  <span className="text-xl font-bold text-white">
                    AI 분석 시작
                  </span>
                </>
              )}
            </div>
          </button>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-3 p-5 bg-gradient-to-r from-[var(--info)]/10 to-[var(--primary-500)]/5 border border-[var(--info)]/20 rounded-2xl"
        >
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-[var(--text-100)] mb-1">
              작성 팁
            </h4>
            <p className="text-sm text-[var(--text-400)] leading-relaxed">
              캐릭터명: 대사 형식으로 작성하면 AI가 더 정확하게 분석합니다.
              각 대사는 줄바꿈으로 구분해주세요.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}