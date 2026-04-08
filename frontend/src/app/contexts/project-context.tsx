import { createContext, useContext, useState, ReactNode } from "react";

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

interface ProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projectName: string | null;
  setProjectName: (name: string | null) => void;
  styleId: string;
  setStyleId: (id: string) => void;
  globalEmotion: string;
  setGlobalEmotion: (emotion: string) => void;
  scriptText: string;
  setScriptText: (text: string) => void;
  globalContext: string;
  setGlobalContext: (context: string) => void;
  segments: Segment[];
  setSegments: (segments: Segment[]) => void;
  updateSegment: (index: int, updates: Partial<Segment>) => void;
  runId: string;
  setRunId: (id: string) => void;
  combinedVideoUrl: string | null;
  setCombinedVideoUrl: (url: string | null) => void;
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<string>("personification");
  const [globalEmotion, setGlobalEmotion] = useState<string>("normal");
  const [scriptText, setScriptText] = useState<string>("");
  const [globalContext, setGlobalContext] = useState<string>("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [runId, setRunId] = useState<string>("");
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null);

  const updateSegment = (index: number, updates: Partial<Segment>) => {
    setSegments((prev) => {
      const newSegments = [...prev];
      newSegments[index] = { ...newSegments[index], ...updates };
      return newSegments;
    });
  };

  const clearProject = () => {
    setProjectId(null);
    setProjectName(null);
    setStyleId("personification");
    setGlobalEmotion("normal");
    setScriptText("");
    setGlobalContext("");
    setSegments([]);
    setRunId("");
    setCombinedVideoUrl(null);
  };

  return (
    <ProjectContext.Provider 
      value={{ 
        projectId, setProjectId,
        projectName, setProjectName,
        styleId, setStyleId, 
        globalEmotion, setGlobalEmotion,
        scriptText, setScriptText,
        globalContext, setGlobalContext,
        segments, setSegments, updateSegment,
        runId, setRunId,
        combinedVideoUrl, setCombinedVideoUrl,
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
