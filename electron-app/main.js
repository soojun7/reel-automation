const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const Store = require('electron-store');

const store = new Store();
const isDev = !app.isPackaged;

let mainWindow;

// ffmpeg 경로 찾기
function getFFmpegPath() {
  if (isDev) {
    // 개발 중: 시스템에 설치된 ffmpeg 사용
    return 'ffmpeg';
  }
  // 프로덕션: 번들된 ffmpeg 사용
  const platform = process.platform;
  const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  return path.join(process.resourcesPath, 'ffmpeg', ffmpegName);
}

function getFFprobePath() {
  if (isDev) {
    return 'ffprobe';
  }
  const platform = process.platform;
  const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  return path.join(process.resourcesPath, 'ffmpeg', ffprobeName);
}

// 프로젝트 저장 경로
function getProjectsDir() {
  const documentsPath = app.getPath('documents');
  const projectsDir = path.join(documentsPath, 'ReelStudio', 'projects');
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  return projectsDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ===== IPC Handlers =====

// 파일 다운로드 (URL -> 로컬)
ipcMain.handle('download-file', async (event, { url, savePath }) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 리다이렉트 처리
        protocol.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(savePath);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(savePath);
        });
      }
    }).on('error', (err) => {
      fs.unlink(savePath, () => {});
      reject(err);
    });
  });
});

// 프로젝트 디렉토리 생성
ipcMain.handle('create-project-dir', async (event, { runId }) => {
  const projectDir = path.join(getProjectsDir(), runId);
  const imagesDir = path.join(projectDir, 'images');
  const videosDir = path.join(projectDir, 'videos');

  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  return { projectDir, imagesDir, videosDir };
});

// 영상 길이 확인
ipcMain.handle('get-video-duration', async (event, { videoPath }) => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(getFFprobePath(), [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(output.trim()) || 0);
      } else {
        reject(new Error('ffprobe failed'));
      }
    });
  });
});

// 영상 합치기
ipcMain.handle('combine-videos', async (event, {
  videoPaths,
  outputPath,
  options = {}
}) => {
  const {
    includeSubtitles = false,
    srtPath = null,
    subtitlePath = null,
    fontName = 'NotoSansKR-Bold',
    maxChars = 15,
    zoomEffect = false,
    zoomIntensity = 50,
    transitionType = 'none',
    backgroundMusicPath = null
  } = options;

  // srtPath가 있으면 그걸 사용, 없으면 subtitlePath 사용
  const actualSubtitlePath = srtPath || subtitlePath;

  return new Promise(async (resolve, reject) => {
    try {
      const ffmpeg = getFFmpegPath();
      const n = videoPaths.length;

      // 1. 각 영상 정규화 (동일한 포맷으로)
      const normalizedPaths = [];
      for (let i = 0; i < n; i++) {
        const normalized = videoPaths[i].replace('.mp4', '_norm.mp4');

        let vfFilter = 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30';

        if (zoomEffect) {
          const zoomScale = 1.0 + (zoomIntensity / 100) * 0.3;
          vfFilter = `zoompan=z='min(zoom+0.001,${zoomScale})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=720x1280:fps=30`;
        }

        await runFFmpeg([
          '-i', videoPaths[i],
          '-vf', vfFilter,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-c:a', 'aac', '-ar', '44100', '-ac', '2',
          '-y', normalized
        ]);
        normalizedPaths.push(normalized);
      }

      // 2. 영상 합치기
      const inputs = normalizedPaths.flatMap(p => ['-i', p]);
      const filterParts = normalizedPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
      let filterComplex = `${filterParts}concat=n=${n}:v=1:a=1[outv][outa]`;

      const concatOutput = outputPath.replace('.mp4', '_concat.mp4');
      await runFFmpeg([
        ...inputs,
        '-filter_complex', filterComplex,
        '-map', '[outv]', '-map', '[outa]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac',
        '-y', concatOutput
      ]);

      let currentOutput = concatOutput;

      // 3. 자막 추가 (옵션)
      if (includeSubtitles && actualSubtitlePath && fs.existsSync(actualSubtitlePath)) {
        const subtitledOutput = outputPath.replace('.mp4', '_sub.mp4');
        // 폰트 설정
        const fontStyle = `FontName=${fontName},FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=2`;
        await runFFmpeg([
          '-i', currentOutput,
          '-vf', `subtitles=${actualSubtitlePath}:force_style='${fontStyle}'`,
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
          '-c:a', 'copy',
          '-y', subtitledOutput
        ]);
        currentOutput = subtitledOutput;
      }

      // 4. 배경음악 추가 (옵션)
      if (backgroundMusicPath && fs.existsSync(backgroundMusicPath)) {
        const musicOutput = outputPath.replace('.mp4', '_music.mp4');
        await runFFmpeg([
          '-i', currentOutput,
          '-i', backgroundMusicPath,
          '-filter_complex', '[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first[outa]',
          '-map', '0:v', '-map', '[outa]',
          '-c:v', 'copy', '-c:a', 'aac',
          '-shortest',
          '-y', musicOutput
        ]);
        currentOutput = musicOutput;
      }

      // 5. 최종 파일로 복사
      if (currentOutput !== outputPath) {
        fs.copyFileSync(currentOutput, outputPath);
      }

      // 6. 임시 파일 정리
      [...normalizedPaths, concatOutput].forEach(f => {
        try { if (f !== outputPath && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      });

      resolve(outputPath);
    } catch (err) {
      reject(err);
    }
  });
});

// ffmpeg 실행 헬퍼
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), args);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

// SRT 생성
ipcMain.handle('generate-srt', async (event, { segments, outputPath, maxChars = 15 }) => {
  let srtContent = '';
  let currentTime = 0;
  let idx = 1;
  const avgSecondsPerChar = 0.1; // 한 글자당 평균 0.1초

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const dialogue = seg.dialogue || '';

    if (!dialogue) {
      continue;
    }

    // 대사 길이에 따라 예상 길이 계산
    const estimatedDuration = Math.max(2, dialogue.length * avgSecondsPerChar);

    // 글자수로 나누기
    const chunks = [];
    let words = dialogue;
    while (words.length > 0) {
      if (words.length <= maxChars) {
        chunks.push(words);
        break;
      }
      let cutPos = maxChars;
      for (let j = maxChars; j > 0; j--) {
        if (' ,.:!?'.includes(words[j - 1])) {
          cutPos = j;
          break;
        }
      }
      chunks.push(words.slice(0, cutPos).trim());
      words = words.slice(cutPos).trim();
    }

    const chunkDuration = estimatedDuration / chunks.length;

    for (const chunk of chunks) {
      const startTime = currentTime;
      const endTime = currentTime + chunkDuration;

      const formatTime = (t) => {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
      };

      srtContent += `${idx}\n`;
      srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
      srtContent += `${seg.character_name}: ${chunk}\n\n`;

      idx++;
      currentTime = endTime;
    }
  }

  fs.writeFileSync(outputPath, srtContent, 'utf-8');
  return outputPath;
});

// 프로젝트 저장
ipcMain.handle('save-project', async (event, { runId, data }) => {
  const projectDir = path.join(getProjectsDir(), runId);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  const projectFile = path.join(projectDir, 'project.json');
  fs.writeFileSync(projectFile, JSON.stringify(data, null, 2));
  return projectFile;
});

// 프로젝트 로드
ipcMain.handle('load-project', async (event, { runId }) => {
  const projectFile = path.join(getProjectsDir(), runId, 'project.json');
  if (fs.existsSync(projectFile)) {
    return JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
  }
  return null;
});

// 프로젝트 목록
ipcMain.handle('list-projects', async () => {
  const projectsDir = getProjectsDir();
  const dirs = fs.readdirSync(projectsDir).filter(d => {
    const projectFile = path.join(projectsDir, d, 'project.json');
    return fs.existsSync(projectFile);
  });

  return dirs.map(d => {
    const projectFile = path.join(projectsDir, d, 'project.json');
    try {
      const data = JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
      return {
        runId: d,
        name: data.projectName || d,
        createdAt: data.createdAt || null,
        segmentCount: data.segments?.length || 0
      };
    } catch {
      return { runId: d, name: d };
    }
  });
});

// 폴더 열기
ipcMain.handle('open-folder', async (event, { folderPath }) => {
  shell.openPath(folderPath);
});

// 파일 저장 다이얼로그
ipcMain.handle('save-dialog', async (event, { defaultPath, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters
  });
  return result.filePath;
});

// 파일 직접 저장 (바이너리 데이터)
ipcMain.handle('save-file', async (event, { filePath, data }) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, Buffer.from(data));
  return filePath;
});

// Claude API 호출 (CORS 우회)
ipcMain.handle('call-claude-api', async (event, { apiKey, prompt, model = 'claude-sonnet-4-20250514' }) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Claude API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
});

// Runware API 호출 - 이미지 생성 (CORS 우회)
ipcMain.handle('call-runware-image', async (event, { apiKey, prompt, negativePrompt, seedImage }) => {
  return new Promise((resolve, reject) => {
    const payload = {
      taskType: 'imageInference',
      taskUUID: require('crypto').randomUUID(),
      positivePrompt: prompt,
      negativePrompt: negativePrompt || '2D, flat, simple, low quality, blurry, text, watermark, nsfw, anime, sketch, drawing, painting',
      width: 768,
      height: 1344,  // 64의 배수 (9:16 비율 유지)
      model: 'runware:100@1',
      numberResults: 1,
      outputFormat: 'PNG'
    };

    if (seedImage) {
      payload.inputs = { referenceImages: [seedImage] };
    }

    const postData = JSON.stringify([payload]);

    const options = {
      hostname: 'api.runware.ai',
      port: 443,
      path: '/v1/images',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            const imageUrl = result.data?.[0]?.imageURL || result.data?.[0]?.imageUrl;
            if (imageUrl) {
              resolve({ imageUrl });
            } else {
              reject(new Error('No image URL in response'));
            }
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Runware API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
});

// Runware API 호출 - 비디오 생성 (CORS 우회)
ipcMain.handle('call-runware-video', async (event, { apiKey, prompt, imageUrl, duration }) => {
  return new Promise(async (resolve, reject) => {
    const taskUUID = require('crypto').randomUUID();

    const payload = [{
      taskType: 'videoInference',
      taskUUID: taskUUID,
      model: 'xai:grok-imagine@video',
      outputFormat: 'mp4',
      height: 1280,
      width: 720,
      numberResults: 1,
      inputs: { frameImages: [{ image: imageUrl }] },
      positivePrompt: prompt,
      duration: duration || 5,
      deliveryMethod: 'async'
    }];

    const postData = JSON.stringify(payload);

    const options = {
      hostname: 'api.runware.ai',
      port: 443,
      path: '/v1/videos',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // 1. 비디오 생성 요청
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', async () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Runware video API error: ${res.statusCode}`));
          return;
        }

        // 2. 폴링으로 결과 대기
        for (let i = 0; i < 36; i++) {
          await new Promise(r => setTimeout(r, 5000));

          try {
            const pollResult = await pollRunwareVideo(apiKey, taskUUID);
            if (pollResult.status === 'success' && pollResult.videoUrl) {
              resolve({ videoUrl: pollResult.videoUrl });
              return;
            } else if (pollResult.status === 'error') {
              reject(new Error('Video generation failed'));
              return;
            }
          } catch (e) {
            // 계속 폴링
          }
        }

        reject(new Error('Video generation timeout'));
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
});

// Runware 폴링 헬퍼
function pollRunwareVideo(apiKey, taskUUID) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify([
      { taskType: 'getResponse', taskUUID: taskUUID, numberResults: 1 }
    ]);

    const options = {
      hostname: 'api.runware.ai',
      port: 443,
      path: '/v1',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const item = result.data?.[0];
          if (item?.status === 'success') {
            resolve({ status: 'success', videoUrl: item.videoURL || item.videoUrl });
          } else if (item?.status === 'error') {
            resolve({ status: 'error' });
          } else {
            resolve({ status: 'pending' });
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
