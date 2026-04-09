// Electron API 타입 정의
interface ElectronAPI {
  downloadFile: (url: string, savePath: string) => Promise<string>;
  createProjectDir: (runId: string) => Promise<{ projectDir: string; imagesDir: string; videosDir: string }>;
  getVideoDuration: (videoPath: string) => Promise<number>;
  combineVideos: (videoPaths: string[], outputPath: string, options?: CombineOptions) => Promise<string>;
  generateSrt: (segments: SegmentInfo[], outputPath: string, maxChars?: number) => Promise<string>;
  saveProject: (runId: string, data: any) => Promise<string>;
  loadProject: (runId: string) => Promise<any>;
  listProjects: () => Promise<ProjectInfo[]>;
  openFolder: (folderPath: string) => Promise<void>;
  saveDialog: (defaultPath: string, filters: any[]) => Promise<string | undefined>;
  saveFile: (filePath: string, data: Uint8Array) => Promise<void>;
  // API 호출 (CORS 우회)
  callClaudeApi: (apiKey: string, prompt: string, model?: string) => Promise<any>;
  callRunwareImage: (apiKey: string, prompt: string, negativePrompt?: string, seedImage?: string) => Promise<{ imageUrl: string }>;
  callRunwareVideo: (apiKey: string, prompt: string, imageUrl: string, duration?: number) => Promise<{ videoUrl: string }>;
  isElectron: boolean;
}

interface SegmentInfo {
  character_name: string;
  dialogue: string;
}

interface CombineOptions {
  includeSubtitles?: boolean;
  srtPath?: string;
  subtitlePath?: string;
  fontName?: string;
  maxChars?: number;
  zoomEffect?: boolean;
  zoomIntensity?: number;
  transitionType?: string;
  backgroundMusicPath?: string;
}

interface ProjectInfo {
  runId: string;
  name: string;
  createdAt?: string;
  segmentCount?: number;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Electron 환경인지 확인
export const isElectron = (): boolean => {
  return !!(window.electronAPI?.isElectron);
};

// Electron API 가져오기
export const getElectronAPI = (): ElectronAPI | null => {
  return window.electronAPI || null;
};

// 파일 다운로드 (Electron: 로컬 저장, Web: URL 반환)
export const downloadFile = async (url: string, savePath: string): Promise<string> => {
  const api = getElectronAPI();
  if (api) {
    return api.downloadFile(url, savePath);
  }
  // 웹에서는 URL 그대로 반환
  return url;
};

// 프로젝트 디렉토리 생성
export const createProjectDir = async (runId: string) => {
  const api = getElectronAPI();
  if (api) {
    return api.createProjectDir(runId);
  }
  return null;
};

// 영상 합치기
export const combineVideos = async (
  videoPaths: string[],
  outputPath: string,
  options?: CombineOptions
): Promise<string> => {
  const api = getElectronAPI();
  if (api) {
    return api.combineVideos(videoPaths, outputPath, options);
  }
  throw new Error('Electron API not available');
};

// SRT 생성
export const generateSrt = async (
  segments: SegmentInfo[],
  outputPath: string,
  maxChars = 15
): Promise<string> => {
  const api = getElectronAPI();
  if (api) {
    return api.generateSrt(segments, outputPath, maxChars);
  }
  throw new Error('Electron API not available');
};

// 파일 저장
export const saveFile = async (filePath: string, data: Uint8Array): Promise<void> => {
  const api = getElectronAPI();
  if (api) {
    return api.saveFile(filePath, data);
  }
  throw new Error('Electron API not available');
};

// 프로젝트 저장
export const saveProject = async (runId: string, data: any): Promise<string | null> => {
  const api = getElectronAPI();
  if (api) {
    return api.saveProject(runId, data);
  }
  // 웹에서는 localStorage 사용
  localStorage.setItem(`project-${runId}`, JSON.stringify(data));
  return null;
};

// 프로젝트 로드
export const loadProject = async (runId: string): Promise<any> => {
  const api = getElectronAPI();
  if (api) {
    return api.loadProject(runId);
  }
  // 웹에서는 localStorage 사용
  const data = localStorage.getItem(`project-${runId}`);
  return data ? JSON.parse(data) : null;
};

// 프로젝트 목록
export const listProjects = async (): Promise<ProjectInfo[]> => {
  const api = getElectronAPI();
  if (api) {
    return api.listProjects();
  }
  return [];
};

// 폴더 열기
export const openFolder = async (folderPath: string): Promise<void> => {
  const api = getElectronAPI();
  if (api) {
    return api.openFolder(folderPath);
  }
};

// 저장 다이얼로그
export const showSaveDialog = async (
  defaultPath: string,
  filters: { name: string; extensions: string[] }[]
): Promise<string | undefined> => {
  const api = getElectronAPI();
  if (api) {
    return api.saveDialog(defaultPath, filters);
  }
  return undefined;
};
