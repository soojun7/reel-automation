import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface Segment {
  character_name: string;
  dialogue: string;
  brand_domain: string;
  image_prompt: string;
  video_prompt: string;
  seed_image_url: string | null;
  seed_image_data?: string | null; // For custom uploads
  is_logo?: boolean; // Whether to use reference image
  emotion?: string; // Per-character emotion (normal, happy, kind, excited, sad, angry)
  generated_image_url?: string;
  runware_url?: string; // Runware image URL for video generation
  generated_video_url?: string;
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
  clearProject: () => void;
  saveProject: () => Promise<void>;  // 수동 저장
  loadProject: (projectId: string) => Promise<boolean>;  // 프로젝트 불러오기
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
};

// localStorage에서 상태 복원
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

// localStorage에 상태 저장
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

  // 서버에 프로젝트 저장
  const saveProjectToServer = useCallback(async (projectState: ProjectState) => {
    if (!projectState.runId) return; // runId가 없으면 저장하지 않음

    try {
      await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectState.runId,
          project_name: projectState.projectName,
          style_id: projectState.styleId,
          global_emotion: projectState.globalEmotion,
          script_text: projectState.scriptText,
          global_context: projectState.globalContext,
          segments: projectState.segments,
          combined_video_url: projectState.combinedVideoUrl
        })
      });
      console.log("[project] Saved to server:", projectState.runId);
    } catch (e) {
      console.error("[project] Failed to save to server:", e);
    }
  }, []);

  // 서버에서 프로젝트 불러오기
  const loadProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const resp = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (!resp.ok) return false;

      const data = await resp.json();
      setState({
        projectId: data.project_id,
        projectName: data.project_name,
        styleId: data.style_id || "personification",
        globalEmotion: data.global_emotion || "normal",
        scriptText: data.script_text || "",
        globalContext: data.global_context || "",
        segments: data.segments || [],
        runId: data.project_id,
        combinedVideoUrl: data.combined_video_url
      });
      console.log("[project] Loaded from server:", projectId);
      return true;
    } catch (e) {
      console.error("[project] Failed to load from server:", e);
      return false;
    }
  }, []);

  // 수동 저장 함수
  const saveProject = useCallback(async () => {
    await saveProjectToServer(state);
    saveToStorage(state);
  }, [state, saveProjectToServer]);

  // 클라이언트에서 localStorage 복원
  useEffect(() => {
    const saved = loadFromStorage();
    setState(saved);
    setIsHydrated(true);

    // URL에서 project_id 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const projectIdFromUrl = params.get("project_id");
    if (projectIdFromUrl) {
      // loadProject 직접 호출 대신 fetch 사용 (dependency 이슈 방지)
      fetch(`${API_URL}/api/projects/${projectIdFromUrl}`)
        .then(resp => resp.ok ? resp.json() : null)
        .then(data => {
          if (data) {
            setState({
              projectId: data.project_id,
              projectName: data.project_name,
              styleId: data.style_id || "personification",
              globalEmotion: data.global_emotion || "normal",
              scriptText: data.script_text || "",
              globalContext: data.global_context || "",
              segments: data.segments || [],
              runId: data.project_id,
              combinedVideoUrl: data.combined_video_url
            });
            console.log("[project] Loaded from URL param:", projectIdFromUrl);
          }
        })
        .catch(e => console.error("[project] Failed to load:", e));
    }
  }, []);

  // 상태 변경시 디바운스로 저장 (localStorage + 서버)
  useEffect(() => {
    if (isHydrated) {
      // localStorage는 즉시 저장
      saveToStorage(state);

      // 서버 저장은 디바운스 (1초 후)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveProjectToServer(state);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isHydrated, saveProjectToServer]);

  const setProjectId = (id: string | null) => setState(prev => ({ ...prev, projectId: id }));
  const setProjectName = (name: string | null) => setState(prev => ({ ...prev, projectName: name }));
  const setStyleId = (id: string) => setState(prev => ({ ...prev, styleId: id }));
  const setGlobalEmotion = (emotion: string) => setState(prev => ({ ...prev, globalEmotion: emotion }));
  const setScriptText = (text: string) => setState(prev => ({ ...prev, scriptText: text }));
  const setGlobalContext = (context: string) => setState(prev => ({ ...prev, globalContext: context }));
  const setSegments = (segments: Segment[]) => setState(prev => ({ ...prev, segments }));
  const setRunId = (id: string) => setState(prev => ({ ...prev, runId: id }));
  const setCombinedVideoUrl = (url: string | null) => setState(prev => ({ ...prev, combinedVideoUrl: url }));

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
        clearProject,
        saveProject,
        loadProject
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
