export class UIAdapter {
  constructor(_xr, _recorder, _dom) {
    this.xr = _xr;
    this.recorder = _recorder;
    this.dom = _dom || {};

    this.isDesktopMode = false;
    this.lastUrl = null;
  }

  async initialize() {
    this._wireDomEvents();
    this._exposeArUiActions();
    this.xr.setControllerSelectHandler(() => this.handleToggleRecording());
    this.setStatus('Idle');
    await this._autoDetectEnvironment();
  }

  _wireDomEvents() {
    const {
      btnEnterAR, btnStartStop, chkMic, recBadge, statusEl,
      btnReplay, btnDownload, replayPanel, playback, btnCancel,
      chkPreview, previewContainer, livePreview
    } = this.dom;

    if (btnEnterAR) {
      btnEnterAR.addEventListener('click', async () => {
        if (!(await this.xr.isARSupported())) {
          this.setStatus('AR not supported on this device');
          return;
        }
        const active = this.xr.renderer.xr.getSession();
        if (active && this.xr.xrMode === 'ar') {
          await this.xr.exitXR();
          document.body.classList.remove('is-xr');
          this.setStatus('Exited Passthrough');
          btnEnterAR.textContent = 'Enter Passthrough';
        } else {
          try {
            await this.xr.enterAR();
            document.body.classList.add('is-xr');
            this.setStatus('Entered Passthrough');
            btnEnterAR.textContent = 'Exit Passthrough';
          } catch (_) {
            this.setStatus('Failed to enter Passthrough');
          }
        }
      });
    }

    if (btnStartStop) btnStartStop.addEventListener('click', () => this.handleToggleRecording());

    if (btnReplay && replayPanel && playback) {
      btnReplay.addEventListener('click', () => {
        replayPanel.classList.remove('hidden');
        playback.play().catch(() => {});
      });
    }

    if (chkPreview) {
      chkPreview.addEventListener('change', () => {
        if (this.isDesktopMode) {
          chkPreview.checked = false;
          if (livePreview) {
            livePreview.pause();
            livePreview.srcObject = null;
          }
          if (previewContainer) {
            previewContainer.classList.add('hidden');
            previewContainer.setAttribute('aria-hidden', 'true');
          }
          return;
        }
        if (chkPreview.checked) this._enablePreview();
        else this._disablePreview();
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', async () => {
        if (!this.recorder.mediaRecorder || this.recorder.mediaRecorder.state === 'inactive') return;
        await this.recorder.stopAndWait();
        this.recorder.discardCurrent();
        this.recorder.cleanup();
        this._setRecordingUi(false);
        this.setStatus('Recording cancelled. Previous recording preserved.');
        this._disablePreview();
        this.recorder.stopPreviewIfIdle();
      });
    }

    window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r') this.handleToggleRecording(); });
  }

  _exposeArUiActions() {
    this.xr.setArUiActions(this.recorder, {
      onToggleRecord: () => this.handleToggleRecording(),
      onTogglePreview: () => this._togglePreviewFromAr(),
      onToggleMic: () => { if (this.dom.chkMic) this.dom.chkMic.checked = !this.dom.chkMic.checked; },
      getMicEnabled: () => !!(this.dom.chkMic && this.dom.chkMic.checked),
      onExitAR: async () => {
        await this.xr.exitXR();
        document.body.classList.remove('is-xr');
        this.setStatus('Exited Passthrough');
        if (this.dom.btnEnterAR) this.dom.btnEnterAR.textContent = 'Enter Passthrough';
      },
    });
  }

  async _autoDetectEnvironment() {
    const { btnEnterAR, chkPreview, previewContainer } = this.dom;
    try {
      const supported = await this.xr.isARSupported();
      if (!supported) {
        this.setStatus('Desktop mode: webcam backdrop ready');
        this.isDesktopMode = true;
        if (btnEnterAR) { btnEnterAR.disabled = true; btnEnterAR.setAttribute('aria-disabled', 'true'); }
        if (chkPreview && chkPreview.parentElement) chkPreview.parentElement.style.display = 'none';
        if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.setAttribute('aria-hidden', 'true'); }
      } else {
        this.setStatus('AR capable device detected');
        if (btnEnterAR) { btnEnterAR.disabled = false; btnEnterAR.removeAttribute('aria-disabled'); }
      }
    } catch (_) {
      this.setStatus('Desktop mode: webcam backdrop ready');
      this.isDesktopMode = true;
      if (btnEnterAR) { btnEnterAR.disabled = true; btnEnterAR.setAttribute('aria-disabled', 'true'); }
      if (chkPreview && chkPreview.parentElement) chkPreview.parentElement.style.display = 'none';
      if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.setAttribute('aria-hidden', 'true'); }
    }
  }

  async handleToggleRecording() {
    const {
      chkMic, btnReplay, btnDownload, playback, btnCancel
    } = this.dom;
    if (!this.recorder.mediaRecorder || this.recorder.mediaRecorder.state === 'inactive') {
      try {
        await this.recorder.start(!!(chkMic && chkMic.checked));
        this._setRecordingUi(true);
        this.setStatus('Recording...');
        if (!this.isDesktopMode && this.dom.chkPreview && this.dom.chkPreview.checked) this._enablePreview();
      } catch (_) {
        this.setStatus('Recording failed to start');
      }
      return;
    }
    await this.recorder.stopAndWait();
    this.recorder.cleanup();
    const url = this.recorder.resultUrl();
    if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
    this.lastUrl = url;
    if (playback) { playback.src = url; playback.currentTime = 0; }
    if (btnReplay) btnReplay.disabled = false;
    if (btnDownload) {
      btnDownload.href = url;
      btnDownload.setAttribute('download', `webxr-recording-${Date.now()}.webm`);
      btnDownload.removeAttribute('aria-disabled');
    }
    this._setRecordingUi(false);
    this.setStatus('Recording finished. Ready to replay or download.');
  }

  _setRecordingUi(isRecording) {
    const { recBadge, btnStartStop, btnCancel } = this.dom;
    if (isRecording) {
      if (recBadge) recBadge.classList.remove('hidden');
      if (btnStartStop) btnStartStop.textContent = 'Stop Recording';
      if (btnCancel) btnCancel.disabled = false;
      return;
    }
    if (recBadge) recBadge.classList.add('hidden');
    if (btnStartStop) btnStartStop.textContent = 'Start Recording';
    if (btnCancel) btnCancel.disabled = true;
  }

  setStatus(text) {
    const { statusEl } = this.dom;
    if (statusEl) statusEl.textContent = text;
  }

  _enablePreview() {
    const { previewContainer, livePreview } = this.dom;
    this.recorder.ensurePreviewStream().then((stream) => {
      if (!stream || !livePreview) return;
      livePreview.srcObject = stream;
      livePreview.play().catch(() => {});
      if (previewContainer) { previewContainer.classList.remove('hidden'); previewContainer.setAttribute('aria-hidden', 'false'); }
    });
  }

  _disablePreview() {
    const { previewContainer, livePreview } = this.dom;
    if (livePreview) {
      livePreview.pause();
      livePreview.srcObject = null;
    }
    if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.setAttribute('aria-hidden', 'true'); }
  }

  _togglePreviewFromAr() {
    if (this.isDesktopMode) return;
    const { chkPreview } = this.dom;
    if (!chkPreview) return;
    const currently = !!chkPreview.checked;
    chkPreview.checked = !currently;
    const evt = new Event('change', { bubbles: true });
    chkPreview.dispatchEvent(evt);
  }
}


