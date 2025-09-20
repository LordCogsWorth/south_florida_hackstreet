import { BabylonXRService } from './xrService.js';
import { RecorderService } from './recorder.js';

function qs(id) { return document.getElementById(id); }

const dom = {
  statusEl: qs('status'),
  previewContainer: qs('previewContainer'),
  livePreview: qs('livePreview'),
  app: qs('app'),
  btnEnterAR: qs('btnEnterAR'),
  btnStartStop: qs('btnStartStop'),
  btnReplay: qs('btnReplay'),
  btnDownload: qs('btnDownload'),
  btnCancel: qs('btnCancel'),
  recBadge: qs('recBadge'),
  chkMic: qs('chkMic'),
  chkPreview: qs('chkPreview'),
  playback: qs('playback'),
  replayPanel: qs('replayPanel'),
  recordHud: qs('recordHud'),
  hudMic: qs('hudMic'),
};

function setStatus(text) { if (dom.statusEl) dom.statusEl.textContent = text; }

const xr = new BabylonXRService(dom.app, setStatus);
const recorder = new RecorderService();

let lastUrl = null;
let isRecording = false;

function updateRecordingUi(isRecordingNow) {
  if (dom.recBadge) dom.recBadge.classList[isRecordingNow ? 'remove' : 'add']('hidden');
  if (dom.btnStartStop) dom.btnStartStop.textContent = isRecordingNow ? 'Stop Recording' : 'Start Recording';
  if (dom.recordHud) {
    dom.recordHud.classList[isRecordingNow ? 'remove' : 'add']('hidden');
    dom.recordHud.setAttribute('aria-hidden', isRecordingNow ? 'false' : 'true');
  }
  if (dom.hudMic) dom.hudMic.style.display = (isRecordingNow && dom.chkMic && dom.chkMic.checked) ? 'inline-flex' : 'none';
  xr.updateRecordingUi(isRecordingNow);
  xr.setMicIndicatorVisible(!!(isRecordingNow && dom.chkMic && dom.chkMic.checked));
}

function toggleReplay() {
  if (!lastUrl) { setStatus('No recording to replay'); return; }
  if (xr.xrActive) {
    xr.toggleReplayInXR(lastUrl);
    return;
  }
  if (dom.playback) { dom.playback.src = lastUrl; dom.playback.currentTime = 0; dom.playback.play().catch(() => {}); }
  if (dom.replayPanel) dom.replayPanel.classList.remove('hidden');
}

function enablePreview2D() {
  recorder.ensurePreviewStream().then((stream) => {
    if (!stream || !dom.livePreview) return;
    try { dom.livePreview.srcObject = null; } catch (_) {}
    dom.livePreview.srcObject = stream;
    dom.livePreview.muted = true;
    dom.livePreview.playsInline = true;
    try { dom.livePreview.autoplay = true; } catch (_) {}
    dom.livePreview.addEventListener('loadedmetadata', () => {
      try { dom.livePreview.play().catch(() => {}); } catch (_) {}
    }, { once: true });
    dom.livePreview.play().catch(() => {});
    if (dom.previewContainer) { dom.previewContainer.classList.remove('hidden'); dom.previewContainer.setAttribute('aria-hidden', 'false'); }
  });
}

function disablePreview2D() {
  if (dom.livePreview) { dom.livePreview.pause(); dom.livePreview.srcObject = null; }
  if (dom.previewContainer) { dom.previewContainer.classList.add('hidden'); dom.previewContainer.setAttribute('aria-hidden', 'true'); }
  recorder.stopPreviewIfIdle();
}

async function handleToggleRecording() {
  if (!recorder.mediaRecorder || recorder.mediaRecorder.state === 'inactive') {
    try {
      await recorder.start(!!(dom.chkMic && dom.chkMic.checked));
      isRecording = true;
      updateRecordingUi(true);
      setStatus('Recording...');
      if (!xr.xrActive && dom.chkPreview && dom.chkPreview.checked) enablePreview2D();
    } catch (_) {
      setStatus('Recording failed to start');
    }
    return;
  }
  await recorder.stopAndWait();
  recorder.cleanup();
  const url = recorder.resultUrl();
  if (lastUrl && lastUrl !== url) { try { URL.revokeObjectURL(lastUrl); } catch (_) {} }
  lastUrl = url;
  if (dom.playback && !xr.xrActive) { dom.playback.src = url; dom.playback.currentTime = 0; }
  if (dom.btnReplay) dom.btnReplay.disabled = false;
  if (dom.btnDownload) { dom.btnDownload.href = url; dom.btnDownload.setAttribute('download', `webxr-recording-${Date.now()}.webm`); dom.btnDownload.removeAttribute('aria-disabled'); }
  isRecording = false;
  updateRecordingUi(false);
  setStatus('Recording finished. Ready to replay or download.');
}

function wireDomEvents() {
  if (dom.btnStartStop) dom.btnStartStop.addEventListener('click', () => handleToggleRecording());
  if (dom.btnReplay) dom.btnReplay.addEventListener('click', () => toggleReplay());
  if (dom.btnEnterAR) dom.btnEnterAR.addEventListener('click', async () => {
    const active = xr.xrHelper?.baseExperience?.sessionManager?.session;
    if (active) { await xr.exitXR(); return; }
    // HTTPS/localhost hint
    if (!(location.protocol === 'https:' || location.hostname === 'localhost')) { setStatus('AR requires HTTPS or localhost'); return; }
    try { await xr.enterAR(); } catch (_) {}
  });
  if (dom.chkPreview) dom.chkPreview.addEventListener('change', () => { if (dom.chkPreview.checked) enablePreview2D(); else disablePreview2D(); });
  if (dom.chkMic) dom.chkMic.addEventListener('change', () => { if (dom.hudMic) dom.hudMic.style.display = (isRecording && dom.chkMic.checked) ? 'inline-flex' : 'none'; xr.setMicIndicatorVisible(!!(isRecording && dom.chkMic.checked)); });
  if (dom.btnCancel) dom.btnCancel.addEventListener('click', async () => {
    if (!recorder.mediaRecorder || recorder.mediaRecorder.state === 'inactive') return;
    await recorder.stopAndWait();
    recorder.discardCurrent();
    recorder.cleanup();
    updateRecordingUi(false);
    setStatus('Recording cancelled. Previous recording preserved.');
    disablePreview2D();
  });
  // Retry enabling rear camera on user interactions to trigger permission prompts
  const tryEnableRear = async () => { try { await recorder.ensureRearCameraBackground(); } catch (_) {} };
  if (dom.btnStartStop) dom.btnStartStop.addEventListener('click', tryEnableRear);
  if (dom.btnEnterAR) dom.btnEnterAR.addEventListener('click', tryEnableRear);
  if (dom.chkPreview) dom.chkPreview.addEventListener('change', tryEnableRear);
  window.addEventListener('keydown', async (e) => {
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      const session = xr.xrHelper?.baseExperience?.sessionManager?.session;
      if (session) return;
      if (!(location.protocol === 'https:' || location.hostname === 'localhost')) { setStatus('AR requires HTTPS or localhost'); return; }
      try { await xr.enterAR(); } catch (_) {}
    } else if (key === 'escape') {
      const session = xr.xrHelper?.baseExperience?.sessionManager?.session;
      if (!session) return;
      try { await xr.exitXR(); } catch (_) {}
    } else if (key === 'r') {
      handleToggleRecording();
    }
  });
}

async function boot() {
  await xr.init();
  recorder.attachSourceCanvas(xr.getCanvas());
  recorder.setStatusCb(setStatus);
  // Try to enable rear camera background in non-immersive mode
  try { await recorder.ensureRearCameraBackground(); } catch (_) {}
  xr.onXRStateChanged((active) => {
    document.body.classList.toggle('is-xr', !!active);
    if (dom.btnEnterAR) dom.btnEnterAR.textContent = active ? 'Exit Passthrough' : 'Enter Passthrough';
    if (active) {
      if (dom.previewContainer) { dom.previewContainer.classList.add('hidden'); dom.previewContainer.setAttribute('aria-hidden', 'true'); }
      // Disable rear cam background while in immersive AR (not visible anyway)
      recorder.disableRearCameraBackground();
    }
    if (!active) { try { recorder.ensureRearCameraBackground(); } catch (_) {} }
  });

  xr.setControllerSelectHandler(() => handleToggleRecording());
  xr.setArUiActions(recorder, {
    onToggleRecord: () => handleToggleRecording(),
    onTogglePreview: () => toggleReplay(),
    onToggleMic: () => { if (dom.chkMic) dom.chkMic.checked = !dom.chkMic.checked; },
    getMicEnabled: () => !!(dom.chkMic && dom.chkMic.checked),
    onExitAR: async () => { await xr.exitXR(); document.body.classList.remove('is-xr'); if (dom.btnEnterAR) dom.btnEnterAR.textContent = 'Enter Passthrough'; },
  });

  // Initial AR capability hint
  try {
    const ok = await xr.isARSupported();
    if (!ok && dom.btnEnterAR) dom.btnEnterAR.setAttribute('aria-disabled', 'true');
    setStatus(ok ? 'AR capable device detected' : 'Desktop mode: webcam backdrop ready');
  } catch (_) {
    setStatus('Desktop mode: webcam backdrop ready');
  }

  wireDomEvents();
}

boot();


