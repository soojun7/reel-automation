import { FolderPlus, ShoppingBag, Film, FileText, Palette, Image, Video, Sliders, Moon, Sun, Settings as SettingsIcon, Folder, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { useProject } from "../contexts/project-context";

interface SidebarProps {
  onSettingsClick?: () => void;
}

const steps = [
  { path: "/", icon: FolderPlus, label: "프로젝트", number: 1, requiresProject: false },
  { path: "/style-select", icon: Palette, label: "그림체 선택", number: 2, requiresProject: true },
  { path: "/script-input", icon: FileText, label: "대본 입력", number: 3, requiresProject: true },
  { path: "/detailed-settings", icon: Sliders, label: "상세 설정", number: 4, requiresProject: true },
  { path: "/images", icon: Image, label: "이미지 확인", number: 5, requiresProject: true },
  { path: "/video-generation", icon: Video, label: "영상 생성", number: 6, requiresProject: true },
];

export function Sidebar({ onSettingsClick }: SidebarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { projectName, clearProject } = useProject();
  const selectedProject = projectName ? { name: projectName, thumbnail: null } : null;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-72 bg-[var(--bg-800)]/80 backdrop-blur-xl border-r border-[var(--border)] flex flex-col z-40"
    >
      {/* Logo */}
      <div className="p-8 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] rounded-xl blur-lg opacity-50" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] flex items-center justify-center shadow-xl overflow-hidden">
              {/* 3D Combined Icon - Shopping Bag + Film */}
              <div className="relative w-full h-full">
                {/* Shopping Bag Base */}
                <ShoppingBag className="w-7 h-7 text-white/90 absolute top-1.5 left-1.5" strokeWidth={2.5} />
                {/* Film Overlay */}
                <Film className="w-6 h-6 text-white absolute bottom-1 right-1" strokeWidth={3} />
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] bg-clip-text text-transparent">
              SS Studio
            </h1>
          </div>
        </div>
        <p className="text-sm text-[var(--text-400)] ml-[60px] -mt-1">
          AI 숏폼 제작 스튜디오
        </p>
      </div>

      {/* Selected Project Banner */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[var(--border)]"
          >
            <div className="p-4 mx-4 my-3 rounded-xl bg-gradient-to-br from-[var(--primary-500)]/10 to-[var(--secondary-500)]/10 border border-[var(--primary-500)]/20">
              <div className="flex items-start gap-3">
                {selectedProject.thumbnail ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[var(--border)]">
                    <img 
                      src={selectedProject.thumbnail} 
                      alt={selectedProject.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-6 h-6 text-[var(--primary-500)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--primary-500)] mb-0.5">
                    현재 프로젝트
                  </div>
                  <div className="font-semibold text-[var(--text-100)] text-sm truncate">
                    {selectedProject.name}
                  </div>
                </div>
                <button
                  onClick={() => {
                    clearProject();
                    navigate("/");
                  }}
                  className="w-6 h-6 rounded-lg hover:bg-[var(--bg-700)] flex items-center justify-center transition-colors flex-shrink-0"
                  title="프로젝트 선택 해제"
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-400)]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-[var(--text-400)] mb-4 px-3">
          제작 단계
        </div>
        {steps.map((step) => {
          const isDisabled = step.requiresProject && !selectedProject;
          
          return (
            <NavLink
              key={step.path}
              to={step.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  isDisabled
                    ? "opacity-40 cursor-not-allowed pointer-events-none"
                    : isActive
                    ? "bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white shadow-lg shadow-[var(--primary-500)]/20"
                    : "text-[var(--text-300)] hover:bg-[var(--bg-700)] hover:text-[var(--text-100)]"
                }`
              }
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
            >
              {({ isActive }) => (
                <>
                  {isActive && !isDisabled && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={`flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold ${
                    isActive && !isDisabled ? "bg-white/20" : "bg-[var(--bg-600)] group-hover:bg-[var(--bg-500)]"
                  }`}>
                    {step.number}
                  </div>
                  <step.icon className="w-5 h-5" />
                  <span className="font-medium">{step.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-6 border-t border-[var(--border)] space-y-2">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-300)] hover:bg-[var(--bg-700)] hover:text-[var(--text-100)] transition-all"
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="font-medium">설정</span>
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-300)] hover:bg-[var(--bg-700)] hover:text-[var(--text-100)] transition-all"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-5 h-5" />
              <span className="font-medium">라이트 모드</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span className="font-medium">다크 모드</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}