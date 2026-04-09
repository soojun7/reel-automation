// Electron 모드 확인
export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

// API 키 (Electron에서는 로컬 설정에서 가져옴)
export const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || '';
export const RUNWARE_API_KEY = import.meta.env.VITE_RUNWARE_API_KEY || '';

// Web 모드용 API URL (Electron에서는 사용 안 함)
export const API_URL = import.meta.env.PROD ? "" : "http://localhost:8000";
