import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { isElectron, getElectronAPI } from "../../lib/electron-api";

export interface Segment {
  character_name: string;
  dialogue: string;
  brand_domain: string;
  image_prompt: string;
  video_prompt: string;
  seed_image_url: string | null;
  seed_image_data?: string | null;
  is_logo?: boolean;
  emotion?: string;
  generated_image_url?: string;
  runware_url?: string;
  generated_video_url?: string;
  // 로컬 파일 경로 (Electron용)
  local_image_path?: string;
  local_video_path?: string;
}

interface ProjectState {
  projectId: string | null;
  projectName: string | null;
  styleId: string;
  globalEmotion: string;
  scriptText: string;
  globalContext: string;
  segments: Segment[];
  runId: string;
  combinedVideoUrl: string | null;
  // 로컬 경로 (Electron용)
  projectDir: string | null;
  localCombinedVideoPath: string | null;
}

interface ProjectContextType extends ProjectState {
  setProjectId: (id: string | null) => void;
  setProjectName: (name: string | null) => void;
  setStyleId: (id: string) => void;
  setGlobalEmotion: (emotion: string) => void;
  setScriptText: (text: string) => void;
  setGlobalContext: (context: string) => void;
  setSegments: (segments: Segment[]) => void;
  updateSegment: (index: number, updates: Partial<Segment>) => void;
  setRunId: (id: string) => void;
  setCombinedVideoUrl: (url: string | null) => void;
  setProjectDir: (dir: string | null) => void;
  setLocalCombinedVideoPath: (path: string | null) => void;
  clearProject: () => void;
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<boolean>;
  initProjectDir: () => Promise<{ projectDir: string; imagesDir: string; videosDir: string } | null>;
}

const STORAGE_KEY = "reel-studio-project";

const defaultState: ProjectState = {
  projectId: null,
  projectName: null,
  styleId: "personification",
  globalEmotion: "normal",
  scriptText: "",
  globalContext: "",
  segments: [],
  runId: "",
  combinedVideoUrl: null,
  projectDir: null,
  localCombinedVideoPath: null,
};

function loadFromStorage(): ProjectState {
  if (typeof window === "undefined") return defaultState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load from localStorage:", e);
  }
  return defaultState;
}

function saveToStorage(state: ProjectState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProjectState>(defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Electron: 로컬 파일로 저장
  const saveProjectLocal = useCallback(async (projectState: ProjectState) => {
    if (!projectState.runId) return;

    const api = getElectronAPI();
    if (api) {
      try {
        await api.saveProject(projectState.runId, {
          ...projectState,
          createdAt: new Date().toISOString()
        });
        console.log("[project] Saved locally:", projectState.runId);
      } catch (e) {
        console.error("[project] Failed to save locally:", e);
      }
    }
  }, []);

  // 프로젝트 불러오기
  const loadProject = useCallback(async (projectId: string): Promise<boolean> => {
    const api = getElectronAPI();
    if (api) {
      try {
        const data = await api.loadProject(projectId);
        if (data) {
          setState({
            projectId: data.projectId || projectId,
            projectName: data.projectName,
            styleId: data.styleId || "personification",
            globalEmotion: data.globalEmotion || "normal",
            scriptText: data.scriptText || "",
            globalContext: data.globalContext || "",
            segments: data.segments || [],
            runId: data.runId || projectId,
            combinedVideoUrl: data.combinedVideoUrl,
            projectDir: data.projectDir,
            localCombinedVideoPath: data.localCombinedVideoPath,
          });
          console.log("[project] Loaded from local:", projectId);
          return true;
        }
      } catch (e) {
        console.error("[project] Failed to load:", e);
      }
    }
    return false;
  }, []);

  // 수동 저장
  const saveProject = useCallback(async () => {
    if (isElectron()) {
      await saveProjectLocal(state);
    }
    saveToStorage(state);
  }, [state, saveProjectLocal]);

  // 프로젝트 디렉토리 초기화 (Electron용)
  const initProjectDir = useCallback(async () => {
    if (!state.runId) return null;

    const api = getElectronAPI();
    if (api) {
      try {
        const dirs = await api.createProjectDir(state.runId);
        setState(prev => ({ ...prev, projectDir: dirs.projectDir }));
        return dirs;
      } catch (e) {
        console.error("[project] Failed to create project dir:", e);
      }
    }
    return null;
  }, [state.runId]);

  // localStorage 복원
  useEffect(() => {
    const saved = loadFromStorage();
    setState(saved);
    setIsHydrated(true);
  }, []);

  // 상태 변경 시 저장
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(state);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        if (isElectron()) {
          saveProjectLocal(state);
        }
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isHydrated, saveProjectLocal]);

  const setProjectId = (id: string | null) => setState(prev => ({ ...prev, projectId: id }));
  const setProjectName = (name: string | null) => setState(prev => ({ ...prev, projectName: name }));
  const setStyleId = (id: string) => setState(prev => ({ ...prev, styleId: id }));
  const setGlobalEmotion = (emotion: string) => setState(prev => ({ ...prev, globalEmotion: emotion }));
  const setScriptText = (text: string) => setState(prev => ({ ...prev, scriptText: text }));
  const setGlobalContext = (context: string) => setState(prev => ({ ...prev, globalContext: context }));
  const setSegments = (segments: Segment[]) => setState(prev => ({ ...prev, segments }));
  const setRunId = (id: string) => setState(prev => ({ ...prev, runId: id }));
  const setCombinedVideoUrl = (url: string | null) => setState(prev => ({ ...prev, combinedVideoUrl: url }));
  const setProjectDir = (dir: string | null) => setState(prev => ({ ...prev, projectDir: dir }));
  const setLocalCombinedVideoPath = (path: string | null) => setState(prev => ({ ...prev, localCombinedVideoPath: path }));

  const updateSegment = (index: number, updates: Partial<Segment>) => {
    setState(prev => {
      const newSegments = [...prev.segments];
      newSegments[index] = { ...newSegments[index], ...updates };
      return { ...prev, segments: newSegments };
    });
  };

  const clearProject = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ProjectContext.Provider
      value={{
        ...state,
        setProjectId,
        setProjectName,
        setStyleId,
        setGlobalEmotion,
        setScriptText,
        setGlobalContext,
        setSegments,
        updateSegment,
        setRunId,
        setCombinedVideoUrl,
        setProjectDir,
        setLocalCombinedVideoPath,
        clearProject,
        saveProject,
        loadProject,
        initProjectDir,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
