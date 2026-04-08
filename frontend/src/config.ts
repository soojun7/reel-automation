// API URL 설정
// 프로덕션: 같은 서버에서 서빙되므로 빈 문자열 (상대경로)
// 개발: localhost:8000
export const API_URL = import.meta.env.PROD ? "" : "http://localhost:8000";
