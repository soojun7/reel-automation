import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Plus, FolderPlus, Clock, MoreVertical, Trash2, PlayCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useProject } from "../contexts/project-context";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  thumbnail: string;
  status: "draft" | "processing" | "completed";
}

const mockProjects: Project[] = [];

export default function ProjectList() {
  const navigate = useNavigate();
  const { clearProject, setProjectName, setProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("reel_projects");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      createdAt: new Date().toISOString(),
      thumbnail: "",
      status: "draft"
    };

    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    localStorage.setItem("reel_projects", JSON.stringify(updatedProjects));

    clearProject();
    setProjectId(newProject.id);
    setProjectName(newProjectName);
    setIsCreateModalOpen(false);
    setNewProjectName("");
    navigate("/style-select");
  };

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    setProjectId(project.id);
    setProjectName(project.name);
    
    switch (project.status) {
      case "completed":
        navigate("/video-generation");
        break;
      case "processing":
        navigate("/video-generation");
        break;
      case "draft":
        navigate("/style-select");
        break;
    }
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "completed":
        return "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/30";
      case "processing":
        return "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/30";
      case "draft":
        return "text-[var(--text-400)] bg-[var(--bg-700)] border-[var(--border)]";
    }
  };

  const getStatusText = (status: Project["status"]) => {
    switch (status) {
      case "completed":
        return "완료";
      case "processing":
        return "생성 중";
      case "draft":
        return "작성 중";
    }
  };

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-100)] mb-2">
              내 프로젝트
            </h1>
            <p className="text-lg text-[var(--text-400)]">
              숏폼 영상 프로젝트를 관리하세요
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl shadow-lg shadow-[var(--primary-500)]/30 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            새 프로젝트
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 flex items-center justify-center mb-6">
              <FolderPlus className="w-10 h-10 text-[var(--primary-500)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-100)] mb-2">
              첫 프로젝트를 만들어보세요
            </h3>
            <p className="text-[var(--text-400)] mb-6">
              AI가 자동으로 쇼핑 숏폼 영상을 만들어드립니다
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-br from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              새 프로젝트 만들기
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative cursor-pointer"
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />

                <div className="relative bg-[var(--bg-800)]/80 backdrop-blur-xl border border-[var(--border)] hover:border-[var(--primary-400)] rounded-3xl overflow-hidden transition-all shadow-xl">
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden bg-[var(--bg-700)]">
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </div>

                    {/* Play Button Overlay */}
                    {project.status === "completed" && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--text-100)] mb-1 line-clamp-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-400)]">
                          <Clock className="w-4 h-4" />
                          {new Date(project.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="p-2 rounded-lg hover:bg-[var(--bg-700)] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4 text-[var(--text-400)]" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create Project Modal */}
      <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
          <Dialog.Content 
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <Dialog.Title className="sr-only">새 프로젝트 생성</Dialog.Title>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-800)]/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl"
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-500)]/20 to-[var(--secondary-500)]/20 mb-3">
                    <FolderPlus className="w-8 h-8 text-[var(--primary-500)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-100)]">
                    새 프로젝트 생성
                  </h2>
                  <p className="text-sm text-[var(--text-400)]">
                    프로젝트 이름을 입력하세요
                  </p>
                </div>

                {/* Input */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--text-200)]">
                    프로젝트 이름
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="예: 봄 신상 패션 컬렉션"
                    className="w-full px-5 py-4 bg-[var(--bg-700)] border border-[var(--border)] focus:border-[var(--primary-500)] rounded-2xl text-[var(--text-100)] text-lg placeholder:text-[var(--text-500)] focus:outline-none transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateProject();
                      }
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Dialog.Close asChild>
                    <button className="flex-1 px-4 py-3 bg-[var(--bg-700)] hover:bg-[var(--bg-600)] border border-[var(--border)] rounded-xl font-semibold text-[var(--text-200)] transition-all">
                      취소
                    </button>
                  </Dialog.Close>
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[var(--primary-500)] to-[var(--secondary-500)] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    생성하기
                  </button>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}