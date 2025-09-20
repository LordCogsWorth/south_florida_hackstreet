export class RecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.recordedBlobs = [];
    this.mixedStream = null;
    this.micStream = null;
    this.objectUrl = null;
    this.mirrorCanvas = null;
    this.mirrorCtx = null;
    this.mirrorStream = null;
    this.drawId = 0;
    this._stopResolver = null;
    this._stopPromise = null;
    this.rearEnabled = false;
    this.rearStream = null;
    this.rearVideo = null;
    this._setStatus = () => {};
  }

  attachSourceCanvas(_canvas) {
    this.sourceCanvas = _canvas;
  }

  setStatusCb(_cb) {
    this._setStatus = _cb || (() => {});
  }

  async ensurePreviewStream() {
    if (!this.sourceCanvas) throw new Error('No source canvas bound');
    if (!this.mirrorCanvas) {
      this.mirrorCanvas = document.createElement('canvas');
      this.mirrorCtx = this.mirrorCanvas.getContext('2d', { alpha: true });
    }
    this._resizeMirror();
    if (!this.drawId) {
      const draw = () => {
        this._resizeMirror();
        this.mirrorCtx.fillStyle = '#000';
        this.mirrorCtx.fillRect(0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
        if (this.rearEnabled && this._rearReady()) {
          this._drawRearBackground();
        }
        this.mirrorCtx.drawImage(this.sourceCanvas, 0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
        this.drawId = requestAnimationFrame(draw);
      };
      this.drawId = requestAnimationFrame(draw);
    }
    const needsNewStream = !this.mirrorStream ||
      !this.mirrorStream.getVideoTracks ||
      this.mirrorStream.getVideoTracks().length === 0 ||
      this.mirrorStream.getVideoTracks().some(t => t.readyState === 'ended');
    if (needsNewStream) {
      try { if (this.mirrorStream) this.mirrorStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      this.mirrorStream = this.mirrorCanvas.captureStream(30);
    }
    return this.mirrorStream;
  }

  stopPreviewIfIdle() {
    // Stop the mirror draw loop if not recording and no preview consumer
    if ((!this.mediaRecorder || this.mediaRecorder.state === 'inactive')) {
      if (this.drawId) {
        cancelAnimationFrame(this.drawId);
        this.drawId = 0;
      }
      if (this.mirrorStream) {
        this.mirrorStream.getTracks().forEach(t => t.stop());
        this.mirrorStream = null;
      }
    }
  }

  getPreviewStream() {
    return this.mixedStream || this.mirrorStream || null;
  }

  async start(_withMic = true) {
    if (!this.sourceCanvas) throw new Error('No source canvas bound');
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') return;
    this.recordedBlobs = [];

    await this.ensurePreviewStream();

    try {
      if (_withMic && navigator.mediaDevices?.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      }
    } catch (_) {
      // continue without mic
    }

    const tracks = [...this.mirrorStream.getTracks()];
    if (this.micStream) tracks.push(...this.micStream.getTracks());
    this.mixedStream = new MediaStream(tracks);

    const mimeType = this._bestMimeType();
    this.mediaRecorder = new MediaRecorder(this.mixedStream, { mimeType: mimeType || undefined, videoBitsPerSecond: 8000000, audioBitsPerSecond: 128000 });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.recordedBlobs.push(e.data); };
    this.mediaRecorder.onstop = () => { if (this._stopResolver) this._stopResolver(); this._stopResolver = null; this._stopPromise = null; };
    this.mediaRecorder.start(1000);
    this._stopPromise = new Promise((res) => { this._stopResolver = res; });
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
  }

  async stopAndWait() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
    this.stop();
    if (this._stopPromise) {
      const timeout = new Promise((res) => setTimeout(res, 2000));
      await Promise.race([this._stopPromise, timeout]);
    }
  }

  cleanup() {
    if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
    if (this.mixedStream) { this.mixedStream.getTracks().forEach(t => t.stop()); this.mixedStream = null; }
    // don't stop mirror here; preview may be active. Use stopPreviewIfIdle for that.
  }

  resultBlob() {
    const type = this.mediaRecorder?.mimeType || 'video/webm';
    return new Blob(this.recordedBlobs, { type });
  }

  discardCurrent() {
    this.recordedBlobs = [];
  }

  resultUrl() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(this.resultBlob());
    return this.objectUrl;
  }

  _bestMimeType() {
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for (const type of candidates) if (MediaRecorder.isTypeSupported(type)) return type;
    return '';
  }

  _resizeMirror() {
    const sc = this.sourceCanvas;
    if (!sc) return;
    if (this.mirrorCanvas.width !== sc.width || this.mirrorCanvas.height !== sc.height) {
      this.mirrorCanvas.width = sc.width;
      this.mirrorCanvas.height = sc.height;
    }
  }

  async ensureRearCameraBackground() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) return false;
      try {
        const prim = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        prim.getTracks().forEach(t => t.stop());
      } catch (_) {}
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      const rear = devices.filter(d => /back|environment|rear/i.test(d.label || '') || (d.label && !/selfie|front/i.test(d.label))).slice(0, 2);
      const pick = rear[0] || devices.find(d => /environment/i.test(d.label || '')) || devices[0];
      if (!pick) return false;
      if (this.rearStream) { try { this.rearStream.getTracks().forEach(t => t.stop()); } catch (_) {} this.rearStream = null; }
      this.rearStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: pick.deviceId }, width: { ideal: 1280 }, frameRate: { ideal: 30 } },
        audio: false
      });
      if (!this.rearVideo) {
        this.rearVideo = document.createElement('video');
        this.rearVideo.playsInline = true;
        this.rearVideo.muted = true;
        this.rearVideo.autoplay = true;
        this.rearVideo.style.display = 'none';
        document.body.appendChild(this.rearVideo);
      }
      try { this.rearVideo.srcObject = null; } catch (_) {}
      this.rearVideo.srcObject = this.rearStream;
      await new Promise((res) => {
        const ready = () => res();
        this.rearVideo.addEventListener('loadedmetadata', ready, { once: true });
        this.rearVideo.addEventListener('canplay', ready, { once: true });
        try { this.rearVideo.play().then(ready).catch(() => {}); } catch (_) {}
        setTimeout(res, 500);
      });
      this.rearEnabled = true;
      this._setStatus(`Rear camera enabled${pick && pick.label ? ': ' + pick.label : ''}`);
      return true;
    } catch (_) {
      this.rearEnabled = false;
      this._setStatus('Rear camera not available. Ensure HTTPS and allow Camera.');
      return false;
    }
  }

  disableRearCameraBackground() {
    this.rearEnabled = false;
    if (this.rearVideo) {
      try { this.rearVideo.pause(); } catch (_) {}
      try { this.rearVideo.removeAttribute('src'); } catch (_) {}
      try { this.rearVideo.srcObject = null; } catch (_) {}
    }
    if (this.rearStream) {
      try { this.rearStream.getTracks().forEach(t => t.stop()); } catch (_) {}
      this.rearStream = null;
    }
  }

  _rearReady() {
    const v = this.rearVideo;
    if (!v) return false;
    const vw = v.videoWidth || 0;
    const vh = v.videoHeight || 0;
    if (!vw || !vh) return false;
    if (v.readyState < 2) return false;
    return true;
  }

  _drawRearBackground() {
    const v = this.rearVideo;
    if (!v) return;
    const cw = this.mirrorCanvas.width;
    const ch = this.mirrorCanvas.height;
    const vw = v.videoWidth || 1;
    const vh = v.videoHeight || 1;
    const canvasAspect = cw / ch;
    const videoAspect = vw / vh;
    let dw = 0; let dh = 0; let dx = 0; let dy = 0;
    if (videoAspect < canvasAspect) {
      const scale = cw / vw;
      dw = cw;
      dh = vh * scale;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      const scale = ch / vh;
      dw = vw * scale;
      dh = ch;
      dx = (cw - dw) / 2;
      dy = 0;
    }
    try { this.mirrorCtx.drawImage(v, dx, dy, dw, dh); } catch (_) {}
  }
}


