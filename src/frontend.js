// Babylon-based implementation
const statusEl = document.getElementById('status');
const previewContainer = document.getElementById('previewContainer');
const livePreview = document.getElementById('livePreview');
const app = document.getElementById('app');

const canvas = document.createElement('canvas');
canvas.style.width = '100%';
canvas.style.height = '100%';
app.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);

let mediaRecorder = null;
let recordedBlobs = [];
let mirrorCanvas = null;
let mirrorCtx = null;
let mirrorStream = null;
let micStream = null;
let mixedStream = null;
let isRecording = false;
const _prev = {};
let lastUrl = null;
let replayPlane = null;
let replayVideo = null;
let replayTexture = null;
const arUi = { btnRecord: null, recDot: null, recText: null, micLabel: null };
let pointerFeatureRef = null;
let nearFeatureRef = null;
let handFeatureRef = null;
let controllersReadyNotified = false;
let controllerCleanupFns = [];
let lastInputActionAt = 0;
let lastMirrorDrawAt = 0;
const MIRROR_DRAW_INTERVAL_MS = 33; // ~30fps
const AUTO_SCALE = { enabled: true, emaMs: 16.7, lastTunedAt: 0, min: 1.2, max: 2.2, step: 0.2, tuneEveryMs: 1000 };
let isPreviewActive = false;
let previewPlane3d = null;
let previewVideo3d = null;
let previewTexture3d = null;
let previewDynamicTexture3d = null;

// DOM elements
const btnEnterAR = document.getElementById('btnEnterAR');
const btnStartStop = document.getElementById('btnStartStop');
const btnReplay = document.getElementById('btnReplay');
const btnDownload = document.getElementById('btnDownload');
const recBadge = document.getElementById('recBadge');
const chkMic = document.getElementById('chkMic');
const chkPreview = document.getElementById('chkPreview');
const playback = document.getElementById('playback');
const replayPanel = document.getElementById('replayPanel');
const recordHud = document.getElementById('recordHud');
const hudMic = document.getElementById('hudMic');

// XR state
let xrHelper = null;
let xrActive = false;
let arSupportChecked = false;
let arSupported = false;
let cameraPermissionAsked = false;

function setStatus(text) { if (statusEl) statusEl.textContent = text; }

function selectMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  for (const type of candidates) if (MediaRecorder.isTypeSupported(type)) return type;
  return '';
}

async function ensureCaptureStream() {
  if (!mirrorCanvas) {
    mirrorCanvas = document.createElement('canvas');
    // Opaque context prevents transparent frames showing as white in video elements
    try { mirrorCtx = mirrorCanvas.getContext('2d', { alpha: false }); } catch (_) { mirrorCtx = mirrorCanvas.getContext('2d'); }
  }
  let rw = 0;
  let rh = 0;
  try { rw = engine && engine.getRenderWidth ? engine.getRenderWidth(true) : 0; } catch (_) { rw = 0; }
  try { rh = engine && engine.getRenderHeight ? engine.getRenderHeight(true) : 0; } catch (_) { rh = 0; }
  if (!rw || !rh) { rw = canvas.width || 640; rh = canvas.height || 360; }
  if (!rw || !rh) { rw = 640; rh = 360; }
  if (mirrorCanvas.width !== rw || mirrorCanvas.height !== rh) {
    mirrorCanvas.width = rw;
    mirrorCanvas.height = rh;
  }
  const needsNewStream = !mirrorStream ||
    !mirrorStream.getVideoTracks ||
    mirrorStream.getVideoTracks().length === 0 ||
    mirrorStream.getVideoTracks().some(t => t.readyState === 'ended');
  if (needsNewStream) {
    try { if (mirrorStream) mirrorStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    mirrorStream = mirrorCanvas.captureStream(24);
  }
  return mirrorStream;
}

function stopPreviewIfIdle() {
  if (!isRecording && mirrorStream) {
    const tracks = mirrorStream.getTracks();
    tracks.forEach(t => t.stop());
    mirrorStream = null;
  }
}

function toggleReplay() {
  if (!lastUrl) { setStatus('No recording to replay'); return; }
  // If in XR, show replay on a floating plane in front of the user
  if (xrActive) {
    if (!replayPlane) {
      replayPlane = BABYLON.MeshBuilder.CreatePlane('replayPlane', { width: 0.8, height: 0.45 }, engine.scenes[0]);
      const mat = new BABYLON.StandardMaterial('replayMat', engine.scenes[0]);
      mat.emissiveColor = new BABYLON.Color3(1,1,1);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      replayPlane.material = mat;
      replayPlane.isPickable = false;
      replayPlane.isVisible = false;
    }
    if (!replayVideo) {
      replayVideo = document.createElement('video');
      replayVideo.muted = true;
      replayVideo.playsInline = true;
      replayVideo.loop = true;
      replayVideo.preload = 'auto';
    }
    if (!replayTexture) {
      replayTexture = new BABYLON.VideoTexture('replayTex', replayVideo, engine.scenes[0], true, false);
      replayPlane.material.emissiveTexture = replayTexture;
    }
    if (replayPlane.isVisible) {
      replayPlane.isVisible = false;
      try { replayVideo.pause(); } catch (_) {}
      return;
    }
    // Reset the video element before setting a new source to avoid white frames on Quest
    replayPlane.isVisible = false;
    const oldSrc = replayVideo.src || '';
    try { replayVideo.pause(); } catch (_) {}
    try { replayVideo.removeAttribute('src'); } catch (_) {}
    try { replayVideo.load(); } catch (_) {}
    replayVideo.onplaying = () => {
      replayPlane.isVisible = true;
      try { if (replayTexture) replayTexture.update(); } catch (_) {}
    };
    replayVideo.onloadeddata = () => { try { if (replayTexture) replayTexture.update(); } catch (_) {} };
    replayVideo.oncanplay = () => { try { if (replayTexture) replayTexture.update(); } catch (_) {} };
    replayVideo.src = lastUrl;
    try { replayVideo.currentTime = 0; } catch (_) {}
    replayVideo.play().catch(() => {});
    // Safely revoke the previous object URL after switching sources
    if (oldSrc && oldSrc.startsWith('blob:') && oldSrc !== lastUrl) {
      try { URL.revokeObjectURL(oldSrc); } catch (_) {}
    }
    return;
  }
  // Otherwise, use 2D overlay player
  if (playback) { playback.src = lastUrl; playback.currentTime = 0; playback.play().catch(() => {}); }
  if (replayPanel) replayPanel.classList.remove('hidden');
}

function updateRecordingUi(isRecordingNow) {
  if (recBadge) recBadge.classList[isRecordingNow ? 'remove' : 'add']('hidden');
  if (btnStartStop) btnStartStop.textContent = isRecordingNow ? 'Stop Recording' : 'Start Recording';
  if (recordHud) {
    recordHud.classList[isRecordingNow ? 'remove' : 'add']('hidden');
    recordHud.setAttribute('aria-hidden', isRecordingNow ? 'false' : 'true');
  }
  if (hudMic) hudMic.style.display = (isRecordingNow && chkMic && chkMic.checked) ? 'inline-flex' : 'none';
  // AR-space HUD and button label
  try {
    if (arUi.btnRecord && arUi.btnRecord.textBlock) arUi.btnRecord.textBlock.text = isRecordingNow ? 'Stop Recording' : 'Start Recording';
  } catch (_) {}
  if (arUi.recDot) arUi.recDot.isVisible = !!isRecordingNow;
  if (arUi.recText) arUi.recText.isVisible = !!isRecordingNow;
  if (arUi.micLabel) arUi.micLabel.isVisible = !!(isRecordingNow && chkMic && chkMic.checked);
}

async function enablePreview() {
  // Mark active first so draw loop starts producing frames immediately
  isPreviewActive = true;
  await ensureCaptureStream();
  // If in XR, show a floating plane with live video texture
  if (xrActive) {
    if (!previewPlane3d) {
      previewPlane3d = BABYLON.MeshBuilder.CreatePlane('previewPlane3d', { width: 0.6, height: 0.34 }, engine.scenes[0]);
      const mat = new BABYLON.StandardMaterial('previewMat', engine.scenes[0]);
      mat.emissiveColor = new BABYLON.Color3(1,1,1);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      previewPlane3d.material = mat;
      previewPlane3d.isPickable = false;
      previewPlane3d.isVisible = false;
    }
    // Use a DynamicTexture backed by the mirror canvas for reliable XR updates
    const mw = mirrorCanvas ? mirrorCanvas.width : 1024;
    const mh = mirrorCanvas ? mirrorCanvas.height : 576;
    if (!previewDynamicTexture3d) {
      previewDynamicTexture3d = new BABYLON.DynamicTexture('previewDyn', { width: mw, height: mh }, engine.scenes[0], false);
      previewPlane3d.material.emissiveTexture = previewDynamicTexture3d;
    }
    // Populate once immediately to avoid initial white quad, then show
    try {
      // Size mirror to current render size
      let rw = 0; let rh = 0;
      try { rw = engine && engine.getRenderWidth ? engine.getRenderWidth(true) : 0; } catch (_) { rw = 0; }
      try { rh = engine && engine.getRenderHeight ? engine.getRenderHeight(true) : 0; } catch (_) { rh = 0; }
      if (!rw || !rh) { rw = canvas.width || mirrorCanvas.width || 640; rh = canvas.height || mirrorCanvas.height || 360; }
      if (rw > 0 && rh > 0 && (mirrorCanvas.width !== rw || mirrorCanvas.height !== rh)) { mirrorCanvas.width = rw; mirrorCanvas.height = rh; }
      if (mirrorCtx) {
        mirrorCtx.fillStyle = '#000';
        mirrorCtx.fillRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
        mirrorCtx.drawImage(canvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
      }
      if (previewDynamicTexture3d && mirrorCanvas) {
        const size = previewDynamicTexture3d.getSize();
        const dw = (size && size.width) ? size.width : size;
        const dh = (size && size.height) ? size.height : size;
        if (dw !== mirrorCanvas.width || dh !== mirrorCanvas.height) {
          try { previewDynamicTexture3d.scaleTo(mirrorCanvas.width, mirrorCanvas.height); } catch (_) {}
        }
        const dctx = previewDynamicTexture3d.getContext();
        dctx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
        dctx.drawImage(mirrorCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
        previewDynamicTexture3d.update(false);
        // Reveal plane only after texture is actually populated
        previewPlane3d.isVisible = true;
      }
    } catch (_) {}
    // Inform users that passthrough cannot be mirrored into the preview
    setStatus('Preview shows virtual content only in AR; camera passthrough is not capturable.');
    // Hide 2D overlay while in XR
    if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.setAttribute('aria-hidden', 'true'); }
  } else {
    // 2D overlay video element preview
    if (livePreview && mirrorStream) {
      try { livePreview.srcObject = null; } catch (_) {}
      livePreview.srcObject = mirrorStream;
      livePreview.muted = true;
      livePreview.playsInline = true;
      try { livePreview.autoplay = true; } catch (_) {}
      // Ensure playback after metadata is ready (fixes blank preview on some devices)
      livePreview.addEventListener('loadedmetadata', () => {
        try { livePreview.play().catch(() => {}); } catch (_) {}
      }, { once: true });
      livePreview.play().catch(() => {});
    }
    if (previewContainer) { previewContainer.classList.remove('hidden'); previewContainer.setAttribute('aria-hidden', 'false'); }
  }
  isPreviewActive = true;
}

function disablePreview() {
  // Hide AR plane if present
  if (previewPlane3d) previewPlane3d.isVisible = false;
  if (livePreview) { livePreview.pause(); livePreview.srcObject = null; }
  if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.setAttribute('aria-hidden', 'true'); }
  stopPreviewIfIdle();
  isPreviewActive = false;
}

function safeTriggerAction(which) {
  const now = performance.now();
  if (now - lastInputActionAt < 250) return;
  lastInputActionAt = now;
  if (which === 'a') { toggleRecording(); return; }
  if (which === 'b') { toggleReplay(); return; }
}

// Fill background to avoid white frame flashes when transparent
const css = document.createElement('style');
css.textContent = `#livePreview{background:#000}`;
document.head.appendChild(css);

async function detectArSupport() {
  if (arSupportChecked) return arSupported;
  arSupportChecked = true;
  try {
    const hasXR = !!(navigator.xr && navigator.xr.isSessionSupported);
    if (!hasXR) { arSupported = false; return false; }
    arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    return arSupported;
  } catch (_) {
    arSupported = false;
    return false;
  }
}

function isSecureContext() {
  return location.protocol === 'https:' || location.hostname === 'localhost';
}

async function ensureCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    if (navigator.permissions?.query) {
      const st = await navigator.permissions.query({ name: 'camera' });
      if (st.state === 'denied') {
        setStatus('Camera permission denied in browser settings. You may be prompted in-headset.');
        return true; // non-blocking: XR may still prompt in-headset
      }
    }
  } catch (_) {}
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (_) {
    // Non-blocking: on Quest/Oculus, passthrough permission is requested inside XR session
    setStatus('Camera permission will be requested in-headset when entering Passthrough.');
    return true;
  }
}

async function ensureMicPermissionIfEnabled() {
  if (!chkMic || !chkMic.checked) return true;
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    if (navigator.permissions?.query) {
      const st = await navigator.permissions.query({ name: 'microphone' });
      if (st.state === 'denied') {
        setStatus('Microphone permission denied. Recording will be silent.');
        return true;
      }
    }
  } catch (_) {}
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
  } catch (_) {
    // proceed without mic
  }
  return true;
}

async function enterArWithFallback() {
  if (!xrHelper) return;
  const session = xrHelper.baseExperience.sessionManager.session;
  if (session) return;
  const supported = await detectArSupport();
  if (!supported) {
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';
    setStatus(secure ? 'AR not supported on this device/browser' : 'AR requires HTTPS or localhost');
    if (btnEnterAR) btnEnterAR.disabled = true;
    return;
  }
  // Preflight camera permission to avoid requiredPermissions error on some UAs
  if (!cameraPermissionAsked && navigator.mediaDevices?.getUserMedia) {
    cameraPermissionAsked = true;
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      cam.getTracks().forEach(t => t.stop());
    } catch (e) {
      // Non-blocking: let XR session trigger in-headset permission prompt
      setStatus('Camera permission will be requested in-headset.');
    }
  }
  // Try combinations of session options to avoid requiredPermissions failures
  const sessionOptionsVariants = [
    { optionalFeatures: ['dom-overlay', 'hand-tracking'], domOverlay: { root: document.body } },
    { optionalFeatures: ['hand-tracking'] },
    { optionalFeatures: [] },
  ];
  const refSpaces = ['local-floor', 'local'];
  let lastError = null;
  for (const ref of refSpaces) {
    for (const opts of sessionOptionsVariants) {
      try {
        await xrHelper.baseExperience.enterXRAsync('immersive-ar', ref, undefined, opts);
        return;
      } catch (e) {
        lastError = e;
        // continue trying other variants
      }
    }
  }
  const msg = (lastError && (lastError.message || lastError.name)) || 'Unknown error';
  if (/permission|dom.?overlay|required/i.test(String(msg))) {
    setStatus('Failed to enter Passthrough: permissions or DOM overlay not granted/supported');
  } else {
    setStatus('Failed to enter Passthrough: ' + msg);
  }
}

async function toggleRecording() {
  if (!isRecording) {
    await ensureCaptureStream();
    recordedBlobs = [];
    const withMic = !!(chkMic && chkMic.checked);
    try { micStream = withMic ? await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }) : null; } catch (_) { micStream = null; }
    const tracks = [...mirrorStream.getTracks()];
    if (micStream) tracks.push(...micStream.getTracks());
    mixedStream = new MediaStream(tracks);
    const mime = selectMimeType();
    mediaRecorder = new MediaRecorder(mixedStream, { mimeType: mime || undefined, videoBitsPerSecond: 5000000, audioBitsPerSecond: 96000 });
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedBlobs.push(e.data); };
    mediaRecorder.start(250);
    isRecording = true;
    setStatus('Recording...');
    updateRecordingUi(true);
    if (chkPreview && chkPreview.checked) enablePreview();
    return;
  }
  const stopPromise = new Promise((res) => { mediaRecorder.onstop = res; });
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  await Promise.race([stopPromise, new Promise((r) => setTimeout(r, 2000))]);
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (mixedStream) { mixedStream.getTracks().forEach(t => t.stop()); mixedStream = null; }
  isRecording = false;
  setStatus('Recording finished.');
  // Build replay URL
  const blob = new Blob(recordedBlobs, { type: mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : 'video/webm' });
  const prevUrl = lastUrl;
  lastUrl = URL.createObjectURL(blob);
  // If the previous URL is currently being displayed on the replay plane, hide it and defer revocation
  if (prevUrl && replayVideo && replayVideo.src === prevUrl) {
    try { replayVideo.pause(); } catch (_) {}
    if (replayPlane) replayPlane.isVisible = false;
  } else if (prevUrl) {
    try { URL.revokeObjectURL(prevUrl); } catch (_) {}
  }
  updateRecordingUi(false);
  if (btnReplay) btnReplay.disabled = false;
  if (btnDownload) { btnDownload.href = lastUrl; btnDownload.setAttribute('download', `webxr-recording-${Date.now()}.webm`); btnDownload.removeAttribute('aria-disabled'); }
  if (playback && !xrActive) { playback.src = lastUrl; playback.currentTime = 0; }
}

async function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

  const camera = new BABYLON.ArcRotateCamera("cam", Math.PI / 2, Math.PI / 2.5, 3, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.5, -1, -0.3), scene);
  dir.intensity = 0.7;

  // Minimal virtual content only; no ground plane so passthrough is unobstructed

  // Body-locked GUI
  const plane = BABYLON.MeshBuilder.CreatePlane("panel", { width: 0.6, height: 0.36, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
  plane.isPickable = true;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  // Enable near picking for hand interactions when available
  plane.isNearPickable = true;
  const guiTex = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane, 768, 460, false);
  const panel = new BABYLON.GUI.StackPanel();
  panel.paddingTop = "20px";
  guiTex.addControl(panel);
  const label = new BABYLON.GUI.TextBlock();
  label.text = "AR Controls";
  label.color = "white";
  label.fontSize = 28;
  label.height = "60px";
  panel.addControl(label);
  const btnRecord = BABYLON.GUI.Button.CreateSimpleButton("btnRecord", "Start Recording");
  btnRecord.height = "60px";
  btnRecord.color = "white";
  btnRecord.background = "#1d4ed8";
  btnRecord.isPointerBlocker = true;
  btnRecord.onPointerUpObservable.add(() => toggleRecording());
  btnRecord.onPointerClickObservable.add(() => toggleRecording());
  panel.addControl(btnRecord);
  const btnPreview = BABYLON.GUI.Button.CreateSimpleButton("btnPreview", "Replay Last");
  btnPreview.height = "60px";
  btnPreview.color = "white";
  btnPreview.background = "#374151";
  btnPreview.isPointerBlocker = true;
  btnPreview.onPointerUpObservable.add(() => toggleReplay());
  btnPreview.onPointerClickObservable.add(() => toggleReplay());
  panel.addControl(btnPreview);

  const btnLive = BABYLON.GUI.Button.CreateSimpleButton("btnLive", "Show Preview");
  btnLive.height = "60px";
  btnLive.color = "white";
  btnLive.background = "#059669";
  btnLive.isPointerBlocker = true;
  const toggleLiveHandler = () => {
    if (isPreviewActive) {
      disablePreview();
      try { if (btnLive.textBlock) btnLive.textBlock.text = 'Show Preview'; } catch (_) {}
      return;
    }
    enablePreview();
    try { if (btnLive.textBlock) btnLive.textBlock.text = 'Hide Preview'; } catch (_) {}
  };
  btnLive.onPointerUpObservable.add(() => toggleLiveHandler());
  btnLive.onPointerClickObservable.add(() => toggleLiveHandler());
  panel.addControl(btnLive);

  // Exit AR button (enabled only in XR)
  const btnExit = BABYLON.GUI.Button.CreateSimpleButton("btnExit", "Exit Passthrough");
  btnExit.height = "60px";
  btnExit.color = "white";
  btnExit.background = "#ef4444";
  btnExit.isPointerBlocker = true;
  btnExit.isEnabled = false;
  const handleExit = async () => {
    if (!xrHelper) return;
    try { await xrHelper.baseExperience.exitXRAsync(); } catch (_) {}
  };
  btnExit.onPointerUpObservable.add(() => handleExit());
  btnExit.onPointerClickObservable.add(() => handleExit());
  panel.addControl(btnExit);

  // AR-space recording HUD (top-right of panel)
  const recDot = new BABYLON.GUI.Ellipse();
  recDot.width = "18px";
  recDot.height = "18px";
  recDot.color = "#ef4444";
  recDot.thickness = 0;
  recDot.background = "#ef4444";
  recDot.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  recDot.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  recDot.left = "-20px";
  recDot.top = "10px";
  recDot.isVisible = false;
  guiTex.addControl(recDot);

  const recText = new BABYLON.GUI.TextBlock();
  recText.text = "REC";
  recText.color = "white";
  recText.fontSize = 20;
  recText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  recText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  recText.left = "-48px";
  recText.top = "6px";
  recText.isVisible = false;
  guiTex.addControl(recText);

  const micLabel = new BABYLON.GUI.TextBlock();
  micLabel.text = "MIC";
  micLabel.color = "white";
  micLabel.fontSize = 16;
  micLabel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  micLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  micLabel.left = "-86px";
  micLabel.top = "8px";
  micLabel.isVisible = false;
  guiTex.addControl(micLabel);

  // Store AR UI refs for updates when state changes
  arUi.btnRecord = btnRecord;
  arUi.recDot = recDot;
  arUi.recText = recText;
  arUi.micLabel = micLabel;

  let lastPanelUpdate = 0;
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    if (now - lastPanelUpdate < 33) return;
    lastPanelUpdate = now;
    const cam = scene.activeCamera || camera;
    const forward = cam.getForwardRay(1.2).direction;
    plane.position = cam.position.add(forward.scale(1.2));
    const up = new BABYLON.Vector3(0, 1, 0);
    const right = BABYLON.Vector3.Cross(up, forward).normalize();
    const f2 = BABYLON.Vector3.Cross(right, up).normalize();
    plane.setDirection(f2, 0);
    if (replayPlane) {
      const down = new BABYLON.Vector3(0, -0.35, 0);
      const basePos = cam.position.add(forward.scale(1.2)).add(down);
      replayPlane.position = basePos;
      replayPlane.setDirection(f2, 0);
    }
    if (previewPlane3d) {
      const offset = new BABYLON.Vector3(0.7, -0.12, 0);
      const basePos2 = cam.position.add(forward.scale(1.25)).add(offset);
      previewPlane3d.position = basePos2;
      previewPlane3d.setDirection(f2, 0);
    }
  });

  // XR
  xrHelper = await scene.createDefaultXRExperienceAsync({
    uiOptions: { sessionMode: "immersive-ar", referenceSpaceType: "local-floor" },
    optionalFeatures: false,
    disableDefaultUI: true,
  });
  const xr = xrHelper;

  function cleanupControllerBindings() {
    if (!controllerCleanupFns || !controllerCleanupFns.length) return;
    for (const fn of controllerCleanupFns) {
      try { fn && fn(); } catch (_) {}
    }
    controllerCleanupFns = [];
  }

  function attachControllerBindings() {
    cleanupControllerBindings();
    if (!xr || !xr.input) return;

    // Bind per-controller motion controller button listeners (A/B)
    const onControllerAddedObserver = xr.input.onControllerAddedObservable.add((controller) => {
      try {
        controller.onMotionControllerInitObservable.add((motionController) => {
          try {
            const components = motionController && motionController.components ? Object.values(motionController.components) : [];
            const toId = (c) => (c && (c.id || c.type || c.componentId || '')) + '';
            const findComp = (needle) => components.find((c) => toId(c).toLowerCase().includes(needle));
            const aComp = findComp('a-button') || findComp('primary-button') || findComp('bottom-button');
            const bComp = findComp('b-button') || findComp('secondary-button') || findComp('top-button');

            const addButtonListener = (comp, which) => {
              if (!comp || !comp.onButtonStateChangedObservable) return;
              const token = comp.onButtonStateChangedObservable.add((c) => {
                try {
                  // Only act on press transitions
                  if (c.changes && c.changes.pressed && c.pressed) {
                    safeTriggerAction(which);
                  }
                } catch (_) {}
              });
              controllerCleanupFns.push(() => { try { comp.onButtonStateChangedObservable.remove(token); } catch (_) {} });
            };

            addButtonListener(aComp, 'a');
            addButtonListener(bComp, 'b');
          } catch (_) {}
        });
      } catch (_) {}
    });
    controllerCleanupFns.push(() => { try { xr.input.onControllerAddedObservable.remove(onControllerAddedObserver); } catch (_) {} });

    // Session lifecycle: re-enable pointer selection and rebind on visibility regain and input changes
    const session = xr.input && xr.input.session;
    if (session) {
      const onVisibility = () => {
        if (session.visibilityState === 'visible') {
          try { xr.baseExperience.featuresManager.disableFeature(BABYLON.WebXRFeatureName.POINTER_SELECTION); } catch (_) {}
          try {
            pointerFeatureRef = xr.baseExperience.featuresManager.enableFeature(
              BABYLON.WebXRFeatureName.POINTER_SELECTION,
              'latest',
              { xrInput: xr.input, enablePointerSelectionOnAllControllers: true }
            );
            if (pointerFeatureRef) {
              pointerFeatureRef.displayLaserPointer = true;
              pointerFeatureRef.laserPointerDefaultColor = new BABYLON.Color3(0.1, 0.6, 1);
            }
          } catch (_) {}
        }
      };
      const onInputsChanged = () => {
        // Rebind in case controllers were (dis)connected; next tick to avoid re-entrancy
        setTimeout(() => attachControllerBindings(), 0);
      };
      try { session.addEventListener('visibilitychange', onVisibility); } catch (_) {}
      try { session.addEventListener('inputsourceschange', onInputsChanged); } catch (_) {}
      controllerCleanupFns.push(() => { try { session.removeEventListener('visibilitychange', onVisibility); } catch (_) {} });
      controllerCleanupFns.push(() => { try { session.removeEventListener('inputsourceschange', onInputsChanged); } catch (_) {} });
    }
  }

  // Enable controller ray selection and near interaction (no special session features required)
  try {
    pointerFeatureRef = xr.baseExperience.featuresManager.enableFeature(
      BABYLON.WebXRFeatureName.POINTER_SELECTION,
      "latest",
      { xrInput: xr.input, enablePointerSelectionOnAllControllers: true }
    );
    if (pointerFeatureRef) {
      pointerFeatureRef.displayLaserPointer = false; // reduce overdraw
    }
  } catch (_) {}
  try {
    nearFeatureRef = xr.baseExperience.featuresManager.enableFeature(
      BABYLON.WebXRFeatureName.NEAR_INTERACTION,
      "latest",
      { xrInput: xr.input }
    );
  } catch (_) {}
  try {
    handFeatureRef = xr.baseExperience.featuresManager.enableFeature(
      BABYLON.WebXRFeatureName.HAND_TRACKING,
      "latest",
      { xrInput: xr.input }
    );
  } catch (_) {}

  // Track XR state to toggle UI and (re)wire inputs
  xr.baseExperience.onStateChangedObservable.add((state) => {
    xrActive = state === BABYLON.WebXRState.IN_XR;
    document.body.classList.toggle('is-xr', xrActive);
    if (btnEnterAR) btnEnterAR.textContent = xrActive ? 'Exit Passthrough' : 'Enter Passthrough';
    try { if (btnExit) btnExit.isEnabled = !!xrActive; } catch (_) {}
    if (xrActive) {
      // Lower hardware scaling on XR entry for smoother frame times
      try { engine.setHardwareScalingLevel(1.4); } catch (_) {}
      controllersReadyNotified = false;
      // Re-enable pointer selection after session starts to ensure controllers attach
      try { xr.baseExperience.featuresManager.disableFeature(BABYLON.WebXRFeatureName.POINTER_SELECTION); } catch (_) {}
      try {
        pointerFeatureRef = xr.baseExperience.featuresManager.enableFeature(
          BABYLON.WebXRFeatureName.POINTER_SELECTION,
          "latest",
          { xrInput: xr.input, enablePointerSelectionOnAllControllers: true }
        );
        if (pointerFeatureRef) {
          pointerFeatureRef.displayLaserPointer = false; // reduce overdraw
        }
      } catch (_) {}
      // Bind controller listeners immediately when entering XR
      attachControllerBindings();
      // If preview was active before entering XR, migrate it to AR plane
      if (isPreviewActive) {
        try { enablePreview(); } catch (_) {}
      }
      try {
        xr.input.onControllerAddedObservable.addOnce(() => {
          if (!controllersReadyNotified) { setStatus('Controllers ready'); controllersReadyNotified = true; }
        });
        xr.input.onHandAddedObservable.addOnce(() => {
          if (!controllersReadyNotified) { setStatus('Hand tracking ready'); controllersReadyNotified = true; }
        });
        if (xr.input.session) {
          const notifyIfAny = () => {
            const any = (xr.input.session.inputSources || []).length > 0;
            if (any && !controllersReadyNotified) { setStatus('Inputs ready'); controllersReadyNotified = true; }
          };
          xr.input.session.addEventListener('inputsourceschange', notifyIfAny, { once: true });
        }
      } catch (_) {}
    } else {
      // Clean up listeners on XR exit
      cleanupControllerBindings();
      // Restore crisp rendering in 2D mode
      try { engine.setHardwareScalingLevel(1.0); } catch (_) {}
      // If preview is active when exiting XR, show 2D overlay again
      if (isPreviewActive) {
        try { enablePreview(); } catch (_) {}
      }
    }
  });

  // Hand tracking and DOM overlay will be attempted after entering XR via session options

  // Controller A/B bindings
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    for (const input of xr.input.session?.inputSources || []) {
      const gp = input.gamepad;
      if (!gp || !gp.buttons) continue;
      const a = !!(gp.buttons[3] && gp.buttons[3].pressed);
      const b = !!(gp.buttons[4] && gp.buttons[4].pressed);
      const h = input.handedness || 'none';
      _prev[h] = _prev[h] || { a: false, b: false, at: 0, bt: 0 };
      if (a && !_prev[h].a && now - _prev[h].at > 300) { safeTriggerAction('a'); _prev[h].at = now; }
      if (b && !_prev[h].b && now - _prev[h].bt > 250) { safeTriggerAction('b'); _prev[h].bt = now; }
      _prev[h].a = a; _prev[h].b = b;
    }
  });

  return scene;
}

function tuneHardwareScaling() {
  if (!AUTO_SCALE.enabled || !xrActive) return;
  const now = performance.now();
  if (now - AUTO_SCALE.lastTunedAt < AUTO_SCALE.tuneEveryMs) return;
  AUTO_SCALE.lastTunedAt = now;
  let fps = 60;
  try { fps = engine.getFps ? engine.getFps() : 60; } catch (_) {}
  let level = 1;
  try { level = engine.getHardwareScalingLevel ? engine.getHardwareScalingLevel() : 1; } catch (_) {}
  // Aim for smoothness: relax quality if fps < ~58, sharpen if > ~70
  if (fps < 58 && level < AUTO_SCALE.max) {
    try { engine.setHardwareScalingLevel(Math.min(AUTO_SCALE.max, level + AUTO_SCALE.step)); } catch (_) {}
    return;
  }
  if (fps > 70 && level > AUTO_SCALE.min) {
    try { engine.setHardwareScalingLevel(Math.max(AUTO_SCALE.min, level - AUTO_SCALE.step)); } catch (_) {}
  }
}

engine.onEndFrameObservable.add(() => {
  // Dynamic scaling pass
  tuneHardwareScaling();

  // Only mirror-draw when recording or actively previewing
  if (!isRecording && !isPreviewActive) return;
  if (!mirrorCtx || !mirrorCanvas) return;
  const now = performance.now();
  if (now - lastMirrorDrawAt < MIRROR_DRAW_INTERVAL_MS) return;
  lastMirrorDrawAt = now;
  let rw = 0;
  let rh = 0;
  try { rw = engine && engine.getRenderWidth ? engine.getRenderWidth(true) : 0; } catch (_) { rw = 0; }
  try { rh = engine && engine.getRenderHeight ? engine.getRenderHeight(true) : 0; } catch (_) { rh = 0; }
  if (!rw || !rh) { rw = canvas.width || mirrorCanvas.width || 640; rh = canvas.height || mirrorCanvas.height || 360; }
  if (rw > 0 && rh > 0 && (mirrorCanvas.width !== rw || mirrorCanvas.height !== rh)) {
    mirrorCanvas.width = rw;
    mirrorCanvas.height = rh;
  }
  try {
    // Fill black to avoid transparent/white frames in preview textures
    mirrorCtx.fillStyle = '#000';
    mirrorCtx.fillRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
    mirrorCtx.drawImage(canvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
  } catch (_) {}
  // Update AR dynamic preview texture if visible
  try {
    if (previewPlane3d && previewDynamicTexture3d && mirrorCanvas) {
      const size = previewDynamicTexture3d.getSize();
      const dw = (size && size.width) ? size.width : size;
      const dh = (size && size.height) ? size.height : size;
      if (dw !== mirrorCanvas.width || dh !== mirrorCanvas.height) {
        try { previewDynamicTexture3d.scaleTo(mirrorCanvas.width, mirrorCanvas.height); } catch (_) {}
      }
      const dctx = previewDynamicTexture3d.getContext();
      dctx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
      dctx.drawImage(mirrorCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
      previewDynamicTexture3d.update(false);
      // If we haven't shown the plane yet, reveal it now that the texture is primed
      if (!previewPlane3d.isVisible) previewPlane3d.isVisible = true;
    }
  } catch (_) {}
});

createScene().then((scene) => {
  engine.runRenderLoop(() => scene.render());
});

window.addEventListener('resize', () => engine.resize());

// Wire UI events
if (btnStartStop) btnStartStop.addEventListener('click', () => toggleRecording());
if (btnReplay) btnReplay.addEventListener('click', () => toggleReplay());
if (btnEnterAR) btnEnterAR.addEventListener('click', async () => {
  if (!xrHelper) return;
  const session = xrHelper.baseExperience.sessionManager.session;
  if (session) {
    try { await xrHelper.baseExperience.exitXRAsync(); } catch (_) {}
    return;
  }
  if (!isSecureContext()) { setStatus('AR requires HTTPS or localhost'); return; }
  // Best-effort preflight; continue even if it fails (Quest prompts in-headset)
  await ensureCameraPermission();
  await ensureMicPermissionIfEnabled();
  await enterArWithFallback();
});
if (chkPreview) chkPreview.addEventListener('change', () => { if (chkPreview.checked) enablePreview(); else disablePreview(); });
if (chkMic) chkMic.addEventListener('change', () => { if (hudMic) hudMic.style.display = (isRecording && chkMic.checked) ? 'inline-flex' : 'none'; });
if (chkMic) chkMic.addEventListener('change', () => { if (arUi.micLabel) arUi.micLabel.isVisible = !!(isRecording && chkMic.checked); });

// Keyboard: Enter to enter AR, Esc to exit
window.addEventListener('keydown', async (e) => {
  const key = e.key.toLowerCase();
  if (key === 'enter') {
    if (!xrHelper) return;
    const session = xrHelper.baseExperience.sessionManager.session;
    if (session) return;
    if (!isSecureContext()) { setStatus('AR requires HTTPS or localhost'); return; }
    await ensureCameraPermission();
    await ensureMicPermissionIfEnabled();
    await enterArWithFallback();
  } else if (key === 'escape') {
    if (!xrHelper) return;
    const session = xrHelper.baseExperience.sessionManager.session;
    if (!session) return;
    try { await xrHelper.baseExperience.exitXRAsync(); } catch (_) {}
  }
});

// Preflight AR support UI hint
detectArSupport().then((ok) => {
  if (!ok && btnEnterAR) btnEnterAR.setAttribute('aria-disabled', 'true');
});


