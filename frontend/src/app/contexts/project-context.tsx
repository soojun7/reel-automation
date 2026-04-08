import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  // 클라이언트에서 localStorage 복원
  useEffect(() => {
    const saved = loadFromStorage();
    setState(saved);
    setIsHydrated(true);
  }, []);

  // 상태 변경시 localStorage에 저장
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(state);
    }
  }, [state, isHydrated]);

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
        clearProject
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
