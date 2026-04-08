// API URL 설정 (환경변수 또는 기본값)
export const API_URL = import.meta.env.VITE_API_URL
  ? `https://${import.meta.env.VITE_API_URL}`
  : "http://localhost:8000";
