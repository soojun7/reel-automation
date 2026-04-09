import { useState } from "react";
import { motion } from "motion/react";
import { Settings, Key, Save, Check, FolderOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../contexts/settings-context";
import { isElectron, getElectronAPI } from "../../lib/electron-api";

export default function SettingsPage() {
  const {
    claudeApiKey,
    runwareApiKey,
    outputFolder,
    setClaudeApiKey,
    setRunwareApiKey,
    setOutputFolder,
    isConfigured,
  } = useSettings();

  const [tempClaudeKey, setTempClaudeKey] = useState(claudeApiKey);
  const [tempRunwareKey, setTempRunwareKey] = useState(runwareApiKey);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showRunwareKey, setShowRunwareKey] = useState(false);

  const handleSave = () => {
    setClaudeApiKey(tempClaudeKey);
    setRunwareApiKey(tempRunwareKey);
    toast.success("설정이 저장되었습니다.");
  };

  const handleOpenFolder = async () => {
    const api = getElectronAPI();
    if (api && outputFolder) {
      await api.openFolder(outputFolder);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center">
            <Settings className="w-6 h-6 text-[var(--primary-500)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-100)]">설정</h1>
            <p className="text-sm text-[var(--text-400)]">API 키 및 앱 설정</p>
          </div>
        </div>

        {/* Status */}
        <div className={`mb-6 p-4 rounded-xl border ${isConfigured ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-medium">API 키가 설정되었습니다</span>
              </>
            ) : (
              <>
                <Key className="w-5 h-5 text-yellow-500" />
                <span className="text-yellow-500 font-medium">API 키를 설정해주세요</span>
              </>
            )}
          </div>
        </div>

        {/* API Keys */}
        <div className="space-y-6">
          {/* Claude API Key */}
          <div className="bg-[var(--bg-800)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--text-100)]">Claude API Key</h3>
                <p className="text-sm text-[var(--text-400)]">대본 분석에 사용됩니다</p>
              </div>
              <a
                href="https://console.anthropic.com/account/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--primary-500)] hover:underline flex items-center gap-1"
              >
                키 발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showClaudeKey ? "text" : "password"}
                value={tempClaudeKey}
                onChange={(e) => setTempClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full p-3 pr-20 bg-[var(--bg-700)] border border-[var(--border)] rounded-lg text-[var(--text-100)] placeholder:text-[var(--text-400)] focus:outline-none focus:border-[var(--primary-500)]"
              />
              <button
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-400)] hover:text-[var(--text-200)]"
              >
                {showClaudeKey ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {/* Runware API Key */}
          <div className="bg-[var(--bg-800)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--text-100)]">Runware API Key</h3>
                <p className="text-sm text-[var(--text-400)]">이미지/영상 생성에 사용됩니다</p>
              </div>
              <a
                href="https://runware.ai/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--primary-500)] hover:underline flex items-center gap-1"
              >
                키 발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showRunwareKey ? "text" : "password"}
                value={tempRunwareKey}
                onChange={(e) => setTempRunwareKey(e.target.value)}
                placeholder="rw_..."
                className="w-full p-3 pr-20 bg-[var(--bg-700)] border border-[var(--border)] rounded-lg text-[var(--text-100)] placeholder:text-[var(--text-400)] focus:outline-none focus:border-[var(--primary-500)]"
              />
              <button
                onClick={() => setShowRunwareKey(!showRunwareKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-400)] hover:text-[var(--text-200)]"
              >
                {showRunwareKey ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {/* Output Folder (Electron only) */}
          {isElectron() && outputFolder && (
            <div className="bg-[var(--bg-800)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-100)]">저장 위치</h3>
                  <p className="text-sm text-[var(--text-400)]">프로젝트 파일 저장 경로</p>
                </div>
                <button
                  onClick={handleOpenFolder}
                  className="text-sm text-[var(--primary-500)] hover:underline flex items-center gap-1"
                >
                  폴더 열기 <FolderOpen className="w-3 h-3" />
                </button>
              </div>
              <div className="p-3 bg-[var(--bg-700)] border border-[var(--border)] rounded-lg text-[var(--text-300)] text-sm font-mono">
                {outputFolder}
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--primary-500)]/30 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            설정 저장
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-[var(--bg-800)] border border-[var(--border)] rounded-xl">
          <h4 className="font-medium text-[var(--text-200)] mb-2">정보</h4>
          <ul className="text-sm text-[var(--text-400)] space-y-1">
            <li>• API 키는 로컬에만 저장되며 외부로 전송되지 않습니다.</li>
            <li>• 영상 처리는 모두 로컬에서 이루어집니다.</li>
            <li>• Claude API: 대본 분석용 (텍스트 전송)</li>
            <li>• Runware API: 이미지/영상 생성용 (프롬프트 전송)</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
