# WebXR Recorder for Quest 3

Record WebXR canvas output (and optional mic audio) directly in-browser on Oculus Quest 3. Start/stop from the UI or controller trigger (A/X). Replay the captured video and download as a WebM file.

## Features
- Three.js WebXR scene with `immersive-vr`
 - Passthrough via WebXR `immersive-ar` (Quest passthrough)
- DOM Overlay controls in-headset (falls back gracefully)
- MediaRecorder capture of canvas at 30 FPS
- Optional microphone audio capture via `getUserMedia`
- Replay panel and one-click download (`.webm`)
- Controller trigger (select) toggles recording
 - Optional live preview overlay of the recorded stream (Preview toggle)

## Project Structure
```
index.html           - UI and root elements
desktop.html         - Desktop entry (webcam backdrop)
style.css            - Overlay styles and layout
src/frontend.js      - Front-end wiring and app state
src/xrScene.js       - Three.js WebXR scene manager (VR/AR)
src/recorder.js      - MediaRecorder service and preview stream
src/xrUi.js          - AR-space movable UI panel with preview
src/videoSource.js   - Desktop webcam video abstraction (VideoTexture)
```

## Quick Start (Local)
Modern browsers block file:// access for modules and some APIs. Use a local server.

### macOS/Linux
```bash
cd /Users/samarminana/Documents/GitHub/Untitled/south_florida_hackstreet
python3 -m http.server 8080
```
Then open `http://localhost:8080` in Chrome.

### Node alternative
```bash
npx http-server -p 8080 --cors
```

### Desktop webcam mode
- Open `http://localhost:8080/desktop.html` in Chrome/Edge/Firefox.
- Grant camera permission; webcam appears as background texture. Use Preview and Start Recording.
- 360° mode captures virtual-only equirect output; webcam is shown only in viewport mode.

## Using on Quest 3
1. Ensure Quest Browser is up to date.
2. Put the Quest and your dev machine on the same network.
3. Start a local server (see Quick Start) and find your computer's LAN IP (e.g., `192.168.1.10`).
4. In Quest Browser, open `http://192.168.1.10:8080`.
5. Tap Enter VR or Enter Passthrough.
6. Use the UI or press A/X (trigger/select) to start/stop recording.
   - Toggle Preview to see a small live video box of the recorded stream.
7. After stopping, use Replay or Download.

Notes:
- Mic capture prompts for permission. If denied or unavailable, recording continues with video only.
- Downloads save as WebM. Convert to MP4 on desktop if needed:
  ```bash
  ffmpeg -i input.webm -c:v libx264 -preset veryfast -crf 18 -c:a aac output.mp4
  ```
- If DOM Overlay isn't granted, the overlay floats outside VR; use controller trigger to toggle recording.

## Known Limitations
- MediaRecorder MIME support varies. App selects the best supported type automatically.
- MP4 recording via MediaRecorder is rarely supported in browsers; WebM is expected.
- Long recordings can grow memory use; download or refresh between long takes.
 - In AR (passthrough) mode, browser recording includes only the rendered virtual content. Camera passthrough is not included by WebXR/MediaRecorder for privacy/security.

## Customize Scene
Edit `src/xrScene.js` where the sample cubes are created/animated. Replace with your own content, loaders, or controllers.

## Privacy & Permissions
The app only accesses your microphone if you enable Mic Audio and grant permission. No data leaves your device; recordings are kept in-memory until you download.

## License
MIT