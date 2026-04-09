const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 파일 다운로드
  downloadFile: (url, savePath) =>
    ipcRenderer.invoke('download-file', { url, savePath }),

  // 프로젝트 디렉토리 생성
  createProjectDir: (runId) =>
    ipcRenderer.invoke('create-project-dir', { runId }),

  // 영상 길이 확인
  getVideoDuration: (videoPath) =>
    ipcRenderer.invoke('get-video-duration', { videoPath }),

  // 영상 합치기
  combineVideos: (videoPaths, outputPath, options) =>
    ipcRenderer.invoke('combine-videos', { videoPaths, outputPath, options }),

  // SRT 생성
  generateSrt: (segments, outputPath, maxChars) =>
    ipcRenderer.invoke('generate-srt', { segments, outputPath, maxChars }),

  // 프로젝트 저장
  saveProject: (runId, data) =>
    ipcRenderer.invoke('save-project', { runId, data }),

  // 프로젝트 로드
  loadProject: (runId) =>
    ipcRenderer.invoke('load-project', { runId }),

  // 프로젝트 목록
  listProjects: () =>
    ipcRenderer.invoke('list-projects'),

  // 폴더 열기
  openFolder: (folderPath) =>
    ipcRenderer.invoke('open-folder', { folderPath }),

  // 저장 다이얼로그
  saveDialog: (defaultPath, filters) =>
    ipcRenderer.invoke('save-dialog', { defaultPath, filters }),

  // 파일 저장 (바이너리)
  saveFile: (filePath, data) =>
    ipcRenderer.invoke('save-file', { filePath, data }),

  // Claude API 호출
  callClaudeApi: (apiKey, prompt, model) =>
    ipcRenderer.invoke('call-claude-api', { apiKey, prompt, model }),

  // Runware 이미지 생성
  callRunwareImage: (apiKey, prompt, negativePrompt, seedImage) =>
    ipcRenderer.invoke('call-runware-image', { apiKey, prompt, negativePrompt, seedImage }),

  // Runware 비디오 생성
  callRunwareVideo: (apiKey, prompt, imageUrl, duration) =>
    ipcRenderer.invoke('call-runware-video', { apiKey, prompt, imageUrl, duration }),

  // Electron 여부 확인
  isElectron: true
});
