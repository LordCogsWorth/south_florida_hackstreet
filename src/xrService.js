// Babylon XR Service: encapsulates engine/scene/XR lifecycle and AR-space UI

export class BabylonXRService {
  constructor(_appEl, _setStatus) {
    this.appEl = _appEl;
    this.setStatus = _setStatus || (() => {});

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.appEl.appendChild(this.canvas);

    this.engine = new BABYLON.Engine(this.canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);

    this.scene = null;
    this.xrHelper = null;
    this.xrActive = false;
    this.xrMode = 'none';
    this._onXRStateChanged = null;

    this.pointerFeatureRef = null;
    this.nearFeatureRef = null;
    this.handFeatureRef = null;

    this.controllerCleanupFns = [];
    this._lastInputActionAt = 0;

    this.arUi = { btnRecord: null, recDot: null, recText: null, micLabel: null };
    this.previewPlane3d = null;
    this.previewDynamicTexture3d = null;
    this.replayPlane = null;
    this.replayVideo = null;
    this.replayTexture = null;
    this.isPreviewActiveInXR = false;

    this.AUTO_SCALE = { enabled: true, emaMs: 16.7, lastTunedAt: 0, min: 1.2, max: 2.2, step: 0.2, tuneEveryMs: 1000 };

    this._renderLoopStarted = false;

    // Raw camera access (WebXR Raw Camera Access Module) state
    this.rawCameraEnabled = false;
    this._xrGlBinding = null;
    this._xrRefSpace = null;
    this._camMirrorActive = false;
    this._camProg2D = null;
    this._camProgExt = null;
    this._camVAO = null;
    this._camVBO = null;
    this._camPosLoc = -1;
    this._camTexLoc = null;
    this._camExt = null;
    this._xrFrameCb = null;
    this._xrFrameObserverToken = null;
  }

  async init() {
    this.scene = await this._createScene();
    if (!this._renderLoopStarted) {
      this.engine.runRenderLoop(() => this.scene && this.scene.render());
      this._renderLoopStarted = true;
    }
    window.addEventListener('resize', () => this.resize());
  }

  getCanvas() {
    return this.canvas;
  }

  onXRStateChanged(_cb) {
    this._onXRStateChanged = _cb;
  }

  async isARSupported() {
    try {
      const hasXR = !!(navigator.xr && navigator.xr.isSessionSupported);
      if (!hasXR) return false;
      return await navigator.xr.isSessionSupported('immersive-ar');
    } catch (_) {
      return false;
    }
  }

  async enterAR() {
    if (!this.xrHelper) return;
    const session = this.xrHelper.baseExperience.sessionManager.session;
    if (session) return;

    // Best-effort camera permission preflight (non-blocking)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        cam.getTracks().forEach(t => t.stop());
      }
    } catch (_) {}

    // Try camera-access first (as required), then optional, then without
    const sessionOptionsVariants = [
      { requiredFeatures: ['camera-access'], optionalFeatures: ['dom-overlay', 'hand-tracking'], domOverlay: { root: document.body } },
      { requiredFeatures: ['camera-access'], optionalFeatures: ['hand-tracking'] },
      { requiredFeatures: ['camera-access'], optionalFeatures: [] },
      { optionalFeatures: ['camera-access', 'dom-overlay', 'hand-tracking'], domOverlay: { root: document.body } },
      { optionalFeatures: ['camera-access', 'hand-tracking'] },
      { optionalFeatures: ['camera-access'] },
      { optionalFeatures: ['dom-overlay', 'hand-tracking'], domOverlay: { root: document.body } },
      { optionalFeatures: ['hand-tracking'] },
      { optionalFeatures: [] },
    ];
    const refSpaces = ['local-floor', 'local'];
    let lastError = null;
    for (const ref of refSpaces) {
      for (const opts of sessionOptionsVariants) {
        try {
          await this.xrHelper.baseExperience.enterXRAsync('immersive-ar', ref, undefined, opts);
          // Attempt to initialize raw camera binding after successful entry
          try { await this._tryInitRawCameraBinding(); } catch (_) {}
          try { if (this.rawCameraEnabled) this._enableRawCameraMirror(); } catch (_) {}
          return;
        } catch (e) {
          lastError = e;
        }
      }
    }
    const msg = (lastError && (lastError.message || lastError.name)) || 'Unknown error';
    if (/permission|dom.?overlay|required/i.test(String(msg))) {
      this.setStatus('Failed to enter Passthrough: permissions or DOM overlay not granted/supported');
    } else {
      this.setStatus('Failed to enter Passthrough: ' + msg);
    }
  }

  async exitXR() {
    if (!this.xrHelper) return;
    try { await this.xrHelper.baseExperience.exitXRAsync(); } catch (_) {}
  }

  setControllerSelectHandler(_onPrimary) {
    this._controllerPrimaryHandler = _onPrimary;
  }

  setArUiActions(_recorder, _actions) {
    this._arActions = _actions || {};
    // Build body-locked GUI panel
    const scene = this.scene;
    const plane = BABYLON.MeshBuilder.CreatePlane('panel', { width: 0.6, height: 0.36, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    plane.isPickable = true;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.isNearPickable = true;
    const guiTex = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane, 768, 460, false);
    // Card container (glassy look)
    const card = new BABYLON.GUI.Rectangle();
    card.width = '720px';
    card.height = '420px';
    card.cornerRadius = 24;
    card.thickness = 1;
    card.color = '#ffffff22';
    card.background = '#0b0f16b0';
    card.paddingLeft = '20px';
    card.paddingRight = '20px';
    card.paddingTop = '16px';
    card.paddingBottom = '16px';
    guiTex.addControl(card);

    const panel = new BABYLON.GUI.StackPanel();
    panel.width = '100%';
    panel.paddingTop = '8px';
    panel.spacing = 10;
    card.addControl(panel);

    // Header
    const label = new BABYLON.GUI.TextBlock();
    label.text = 'AR Controls';
    label.color = 'white';
    label.fontSize = 30;
    label.height = '48px';
    panel.addControl(label);

    const subtitle = new BABYLON.GUI.TextBlock();
    subtitle.text = 'Record, preview and manage overlays';
    subtitle.color = '#a3a3a3';
    subtitle.fontSize = 18;
    subtitle.height = '28px';
    panel.addControl(subtitle);

    // Separator
    const sep = new BABYLON.GUI.Rectangle();
    sep.height = '1px';
    sep.thickness = 0;
    sep.background = '#ffffff22';
    sep.width = '100%';
    panel.addControl(sep);

    // Primary action row
    const row1 = new BABYLON.GUI.StackPanel();
    row1.isVertical = false;
    row1.height = '72px';
    row1.spacing = 8;
    row1.width = '100%';
    panel.addControl(row1);

    const btnRecord = BABYLON.GUI.Button.CreateSimpleButton('btnRecord', 'Start Recording');
    btnRecord.height = '60px';
    btnRecord.width = '48%';
    btnRecord.color = 'white';
    btnRecord.background = '#1d4ed8';
    btnRecord.cornerRadius = 16;
    btnRecord.thickness = 0;
    btnRecord.isPointerBlocker = true;
    const handleRecord = () => { if (this._arActions.onToggleRecord) this._arActions.onToggleRecord(); };
    btnRecord.onPointerUpObservable.add(handleRecord);
    btnRecord.onPointerClickObservable.add(handleRecord);
    row1.addControl(btnRecord);

    const btnExit = BABYLON.GUI.Button.CreateSimpleButton('btnExit', 'Exit Passthrough');
    btnExit.height = '60px';
    btnExit.width = '48%';
    btnExit.color = 'white';
    btnExit.background = '#ef4444';
    btnExit.cornerRadius = 16;
    btnExit.thickness = 0;
    btnExit.isPointerBlocker = true;
    const handleExit = async () => { if (this._arActions.onExitAR) await this._arActions.onExitAR(); };
    btnExit.onPointerUpObservable.add(handleExit);
    btnExit.onPointerClickObservable.add(handleExit);
    row1.addControl(btnExit);

    // Secondary action row
    const row2 = new BABYLON.GUI.StackPanel();
    row2.isVertical = false;
    row2.height = '72px';
    row2.spacing = 8;
    row2.width = '100%';
    panel.addControl(row2);

    const btnPreview = BABYLON.GUI.Button.CreateSimpleButton('btnPreview', 'Replay Last');
    btnPreview.height = '60px';
    btnPreview.width = '48%';
    btnPreview.color = 'white';
    btnPreview.background = '#374151';
    btnPreview.cornerRadius = 16;
    btnPreview.thickness = 0;
    btnPreview.isPointerBlocker = true;
    const handleReplay = () => { if (this._arActions.onTogglePreview) this._arActions.onTogglePreview(); };
    btnPreview.onPointerUpObservable.add(handleReplay);
    btnPreview.onPointerClickObservable.add(handleReplay);
    row2.addControl(btnPreview);

    const btnLive = BABYLON.GUI.Button.CreateSimpleButton('btnLive', 'Show Preview');
    btnLive.height = '60px';
    btnLive.width = '48%';
    btnLive.color = 'white';
    btnLive.background = '#059669';
    btnLive.cornerRadius = 16;
    btnLive.thickness = 0;
    btnLive.isPointerBlocker = true;
    const toggleLiveHandler = () => {
      if (this.previewPlane3d && this.previewPlane3d.isVisible) {
        this.disablePreviewInXR();
        try { if (btnLive.textBlock) btnLive.textBlock.text = 'Show Preview'; } catch (_) {}
        return;
      }
      this.enablePreviewInXR();
      try { if (btnLive.textBlock) btnLive.textBlock.text = 'Hide Preview'; } catch (_) {}
    };
    btnLive.onPointerUpObservable.add(toggleLiveHandler);
    btnLive.onPointerClickObservable.add(toggleLiveHandler);
    row2.addControl(btnLive);

    // Mic toggle row
    const micRow = new BABYLON.GUI.StackPanel();
    micRow.isVertical = false;
    micRow.height = '40px';
    micRow.spacing = 8;
    micRow.width = '100%';
    panel.addControl(micRow);

    const micToggle = new BABYLON.GUI.Checkbox();
    micToggle.width = '24px';
    micToggle.height = '24px';
    micToggle.isChecked = !!(this._arActions.getMicEnabled && this._arActions.getMicEnabled());
    micToggle.color = '#10b981';
    micToggle.background = '#111827';
    micToggle.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    micRow.addControl(micToggle);

    const micLabel2 = new BABYLON.GUI.TextBlock();
    micLabel2.text = 'Microphone';
    micLabel2.color = '#d1d5db';
    micLabel2.fontSize = 18;
    micLabel2.height = '24px';
    micLabel2.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    micRow.addControl(micLabel2);

    micToggle.onIsCheckedChangedObservable.add(() => {
      if (this._arActions.onToggleMic) this._arActions.onToggleMic();
    });

    const recDot = new BABYLON.GUI.Ellipse();
    recDot.width = '18px';
    recDot.height = '18px';
    recDot.color = '#ef4444';
    recDot.thickness = 0;
    recDot.background = '#ef4444';
    recDot.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    recDot.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    recDot.left = '-20px';
    recDot.top = '10px';
    recDot.isVisible = false;
    recDot.isPointerBlocker = false;
    guiTex.addControl(recDot);

    const recText = new BABYLON.GUI.TextBlock();
    recText.text = 'REC';
    recText.color = 'white';
    recText.fontSize = 20;
    recText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    recText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    recText.left = '-48px';
    recText.top = '6px';
    recText.isVisible = false;
    recText.isPointerBlocker = false;
    guiTex.addControl(recText);

    const micLabel = new BABYLON.GUI.TextBlock();
    micLabel.text = 'MIC';
    micLabel.color = 'white';
    micLabel.fontSize = 16;
    micLabel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    micLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    micLabel.left = '-86px';
    micLabel.top = '8px';
    micLabel.isVisible = false;
    micLabel.isPointerBlocker = false;
    guiTex.addControl(micLabel);

    this.arUi.btnRecord = btnRecord;
    this.arUi.recDot = recDot;
    this.arUi.recText = recText;
    this.arUi.micLabel = micLabel;

    // Update plane position relative to camera
    let lastPanelUpdate = 0;
    this.scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      if (now - lastPanelUpdate < 33) return;
      lastPanelUpdate = now;
      const cam = this.scene.activeCamera;
      if (!cam) return;
      const forward = cam.getForwardRay(1.2).direction;
      plane.position = cam.position.add(forward.scale(1.2));
      const up = new BABYLON.Vector3(0, 1, 0);
      const right = BABYLON.Vector3.Cross(up, forward).normalize();
      const f2 = BABYLON.Vector3.Cross(right, up).normalize();
      plane.setDirection(f2, 0);
      if (this.replayPlane) {
        const down = new BABYLON.Vector3(0, -0.35, 0);
        const basePos = cam.position.add(forward.scale(1.2)).add(down);
        this.replayPlane.position = basePos;
        this.replayPlane.setDirection(f2, 0);
      }
      if (this.previewPlane3d) {
        const offset = new BABYLON.Vector3(0.7, -0.12, 0);
        const basePos2 = cam.position.add(forward.scale(1.25)).add(offset);
        this.previewPlane3d.position = basePos2;
        this.previewPlane3d.setDirection(f2, 0);
      }
    });
  }

  updateRecordingUi(_isRecording) {
    try {
      if (this.arUi.btnRecord && this.arUi.btnRecord.textBlock) this.arUi.btnRecord.textBlock.text = _isRecording ? 'Stop Recording' : 'Start Recording';
    } catch (_) {}
    if (this.arUi.recDot) this.arUi.recDot.isVisible = !!_isRecording;
    if (this.arUi.recText) this.arUi.recText.isVisible = !!_isRecording;
    try { if (this.arUi.btnRecord) this.arUi.btnRecord.background = _isRecording ? '#ef4444' : '#1d4ed8'; } catch (_) {}
  }

  setMicIndicatorVisible(_visible) {
    if (this.arUi.micLabel) this.arUi.micLabel.isVisible = !!_visible;
  }

  enablePreviewInXR() {
    if (!this.xrActive) return;
    if (!this.previewPlane3d) {
      this.previewPlane3d = BABYLON.MeshBuilder.CreatePlane('previewPlane3d', { width: 0.6, height: 0.34 }, this.scene);
      const mat = new BABYLON.StandardMaterial('previewMat', this.scene);
      mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      this.previewPlane3d.material = mat;
      this.previewPlane3d.isPickable = false;
      this.previewPlane3d.isVisible = false;
    }
    const mw = this.engine.getRenderWidth(true) || this.canvas.width || 1024;
    const mh = this.engine.getRenderHeight(true) || this.canvas.height || 576;
    if (!this.previewDynamicTexture3d) {
      this.previewDynamicTexture3d = new BABYLON.DynamicTexture('previewDyn', { width: mw, height: mh }, this.scene, false);
      this.previewPlane3d.material.emissiveTexture = this.previewDynamicTexture3d;
      try { this.previewPlane3d.material.emissiveTexture.hasAlpha = false; } catch (_) {}
    }
    this._drawPreviewIntoDynamicTexture();
    this.setStatus('Preview shows virtual content only in AR; camera passthrough is not capturable.');
    this.isPreviewActiveInXR = true;
  }

  disablePreviewInXR() {
    if (this.previewPlane3d) this.previewPlane3d.isVisible = false;
    this.isPreviewActiveInXR = false;
  }

  toggleReplayInXR(_url) {
    if (!this.xrActive) return;
    if (!this.replayPlane) {
      this.replayPlane = BABYLON.MeshBuilder.CreatePlane('replayPlane', { width: 0.8, height: 0.45 }, this.scene);
      const mat = new BABYLON.StandardMaterial('replayMat', this.scene);
      mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      this.replayPlane.material = mat;
      this.replayPlane.isPickable = false;
      this.replayPlane.isVisible = false;
    }
    if (!this.replayVideo) {
      this.replayVideo = document.createElement('video');
      this.replayVideo.muted = true;
      this.replayVideo.playsInline = true;
      this.replayVideo.loop = true;
      this.replayVideo.preload = 'auto';
    }
    if (!this.replayTexture) {
      this.replayTexture = new BABYLON.VideoTexture('replayTex', this.replayVideo, this.scene, true, false);
      this.replayPlane.material.emissiveTexture = this.replayTexture;
    }
    if (this.replayPlane.isVisible) {
      this.replayPlane.isVisible = false;
      try { this.replayVideo.pause(); } catch (_) {}
      return;
    }
    // Reset then set URL
    this.replayPlane.isVisible = false;
    const oldSrc = this.replayVideo.src || '';
    try { this.replayVideo.pause(); } catch (_) {}
    try { this.replayVideo.removeAttribute('src'); } catch (_) {}
    try { this.replayVideo.load(); } catch (_) {}
    this.replayVideo.onplaying = () => {
      this.replayPlane.isVisible = true;
      try { if (this.replayTexture) this.replayTexture.update(); } catch (_) {}
    };
    this.replayVideo.onloadeddata = () => { try { if (this.replayTexture) this.replayTexture.update(); } catch (_) {} };
    this.replayVideo.oncanplay = () => { try { if (this.replayTexture) this.replayTexture.update(); } catch (_) {} };
    this.replayVideo.src = _url;
    try { this.replayVideo.currentTime = 0; } catch (_) {}
    this.replayVideo.play().catch(() => {});
    if (oldSrc && oldSrc.startsWith('blob:') && oldSrc !== _url) {
      try { URL.revokeObjectURL(oldSrc); } catch (_) {}
    }
  }

  resize() {
    try { this.engine.resize(); } catch (_) {}
  }

  // Indicates if WebXR Raw Camera Access binding is active
  hasRawCameraAccess() {
    return !!this.rawCameraEnabled;
  }

  // Internal: try to initialize XRWebGLBinding for raw camera access
  async _tryInitRawCameraBinding() {
    try {
      const hasBindingCtor = typeof window !== 'undefined' && typeof window.XRWebGLBinding === 'function';
      if (!hasBindingCtor) { this.rawCameraEnabled = false; return false; }
      const session = this.xrHelper && this.xrHelper.baseExperience && this.xrHelper.baseExperience.sessionManager && this.xrHelper.baseExperience.sessionManager.session;
      if (!session) { this.rawCameraEnabled = false; return false; }
      // Obtain the engine's WebGL context (same context used by XR session)
      const gl = this.engine && (this.engine._gl || this.engine._webGLContext || this.engine._glContext || (this.engine._glEngine && this.engine._glEngine._gl));
      if (!gl) { this.rawCameraEnabled = false; return false; }
      // Bindings may throw if feature not actually granted
      this._xrGlBinding = new XRWebGLBinding(session, gl);
      const hasGet = this._xrGlBinding && typeof this._xrGlBinding.getCameraImage === 'function';
      try {
        // Reference space for viewer pose (prefer local-floor, fallback to local)
        this._xrRefSpace = await session.requestReferenceSpace('local-floor').catch(() => session.requestReferenceSpace('local'));
      } catch (_) { this._xrRefSpace = null; }
      this.rawCameraEnabled = !!hasGet;
      if (this.rawCameraEnabled) this.setStatus('Raw camera access enabled');
      return this.rawCameraEnabled;
    } catch (_) {
      this.rawCameraEnabled = false;
      return false;
    }
  }

  // ---------- Raw Camera Mirroring (experimental) ----------
  _createShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      try { gl.deleteShader(sh); } catch (_) {}
      return null;
    }
    return sh;
  }

  _createProgram(gl, vsSrc, fsSrc) {
    const vs = this._createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = this._createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) { try { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); } catch (_) {} return null; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    try { gl.deleteShader(vs); gl.deleteShader(fs); } catch (_) {}
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      try { gl.deleteProgram(prog); } catch (_) {}
      return null;
    }
    return prog;
  }

  _ensureCameraPrograms(gl) {
    if (this._camProg2D || this._camProgExt) return;
    const vs = `#version 300 es\nlayout(location=0) in vec2 a_pos; out vec2 v_uv; void main(){ v_uv = a_pos * 0.5 + 0.5; v_uv.y = 1.0 - v_uv.y; gl_Position = vec4(a_pos, 0.0, 1.0); }`;
    const fs2D = `#version 300 es\nprecision mediump float; uniform sampler2D u_tex; in vec2 v_uv; out vec4 o; void main(){ o = texture(u_tex, v_uv); }`;
    const fsExt = `#version 300 es\n#extension GL_OES_EGL_image_external_essl3 : require\nprecision mediump float; uniform samplerExternalOES u_tex; in vec2 v_uv; out vec4 o; void main(){ o = texture(u_tex, v_uv); }`;
    this._camProg2D = this._createProgram(gl, vs, fs2D);
    // Try to enable the extension before compiling ext shader
    this._camExt = gl.getExtension('OES_EGL_image_external_essl3') || gl.getExtension('OES_EGL_image_external');
    if (this._camExt) this._camProgExt = this._createProgram(gl, vs, fsExt);
    // Geometry: full screen triangle strip
    this._camVBO = gl.createBuffer();
    this._camVAO = gl.createVertexArray();
    gl.bindVertexArray(this._camVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._camVBO);
    const verts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  _drawCameraToDefaultFramebuffer(gl, camTex, isExternal) {
    if (!camTex) return;
    this._ensureCameraPrograms(gl);
    const prog = (!isExternal && this._camProg2D) ? this._camProg2D : this._camProgExt;
    if (!prog) return;
    const prevVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const prevProg = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevActiveTex = gl.getParameter(gl.ACTIVE_TEXTURE);
    const prevViewport = gl.getParameter(gl.VIEWPORT);
    const prevFB = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.useProgram(prog);
      gl.bindVertexArray(this._camVAO);
      gl.activeTexture(gl.TEXTURE0);
      if (isExternal && this._camProgExt) {
        const loc = gl.getUniformLocation(prog, 'u_tex');
        gl.uniform1i(loc, 0);
        const target = (gl.TEXTURE_EXTERNAL_OES || 0x8D65);
        gl.bindTexture(target, camTex);
      } else {
        const loc = gl.getUniformLocation(prog, 'u_tex');
        gl.uniform1i(loc, 0);
        gl.bindTexture(gl.TEXTURE_2D, camTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } catch (_) {
      // ignore
    } finally {
      try { gl.bindVertexArray(prevVAO); } catch (_) {}
      try { gl.useProgram(prevProg); } catch (_) {}
      try { gl.activeTexture(prevActiveTex); } catch (_) {}
      try { gl.bindFramebuffer(gl.FRAMEBUFFER, prevFB); } catch (_) {}
      try { const vp = prevViewport || [0,0,gl.drawingBufferWidth, gl.drawingBufferHeight]; gl.viewport(vp[0], vp[1], vp[2], vp[3]); } catch (_) {}
    }
  }

  _enableRawCameraMirror() {
    if (!this.rawCameraEnabled || this._camMirrorActive) return;
    const sessionManager = this.xrHelper?.baseExperience?.sessionManager;
    const session = sessionManager?.session;
    const gl = this.engine && (this.engine._gl || this.engine._webGLContext || this.engine._glContext || (this.engine._glEngine && this.engine._glEngine._gl));
    if (!session || !gl) return;
    this._camMirrorActive = true;
    // Try to ensure Babylon scene doesn't clear the default framebuffer (to keep camera background)
    try { if (this.scene) this.scene.autoClear = false; } catch (_) {}
    const drawCamera = (xrFrame) => {
      if (!this._camMirrorActive) return;
      try {
        const space = this._xrRefSpace;
        const pose = space && xrFrame.getViewerPose(space);
        if (!pose || !pose.views || !pose.views.length) return;
        const v = pose.views[0];
        const cam = v && v.camera;
        if (cam && this._xrGlBinding && this._xrGlBinding.getCameraImage) {
          const tex = this._xrGlBinding.getCameraImage(cam);
          try { this._drawCameraToDefaultFramebuffer(gl, tex, false); }
          catch (_) { if (this._camExt) this._drawCameraToDefaultFramebuffer(gl, tex, true); }
        }
      } catch (_) {}
    };
    this._xrFrameCb = drawCamera;
    // Prefer Babylon's XR frame observable for proper ordering relative to scene render
    if (sessionManager && sessionManager.onXRFrameObservable && sessionManager.onXRFrameObservable.add) {
      try { this._xrFrameObserverToken = sessionManager.onXRFrameObservable.add((xrFrame) => drawCamera(xrFrame)); } catch (_) { this._xrFrameObserverToken = null; }
    } else {
      // Fallback: direct session RAF
      const onXRFrame = (time, frame) => { drawCamera(frame); try { session.requestAnimationFrame(onXRFrame); } catch (_) {} };
      this._xrFrameCb = onXRFrame;
      try { session.requestAnimationFrame(onXRFrame); } catch (_) {}
    }
    // Inform user: recording streams the visible canvas; if canvas mirrors camera, recording will include it
    this.setStatus('Camera mirror enabled: recordings may include passthrough (experimental)');
  }

  _disableRawCameraMirror() {
    this._camMirrorActive = false;
    const sessionManager = this.xrHelper?.baseExperience?.sessionManager;
    if (this._xrFrameObserverToken && sessionManager && sessionManager.onXRFrameObservable && sessionManager.onXRFrameObservable.remove) {
      try { sessionManager.onXRFrameObservable.remove(this._xrFrameObserverToken); } catch (_) {}
    }
    this._xrFrameObserverToken = null;
    // Resources will be GC'd; optionally clean up GL objects
    const gl = this.engine && (this.engine._gl || this.engine._webGLContext || this.engine._glContext || (this.engine._glEngine && this.engine._glEngine._gl));
    try {
      if (gl && this._camVAO) gl.deleteVertexArray(this._camVAO);
      if (gl && this._camVBO) gl.deleteBuffer(this._camVBO);
      if (gl && this._camProg2D) gl.deleteProgram(this._camProg2D);
      if (gl && this._camProgExt) gl.deleteProgram(this._camProgExt);
    } catch (_) {}
    this._camVAO = null; this._camVBO = null; this._camProg2D = null; this._camProgExt = null; this._camExt = null;
    try { if (this.scene) this.scene.autoClear = true; } catch (_) {}
  }

  // Internal: create scene and wire XR/features
  async _createScene() {
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.5, 3, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(this.canvas, true);

    new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, -0.3), scene);
    dir.intensity = 0.7;

    // XR
    this.xrHelper = await scene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: 'immersive-ar', referenceSpaceType: 'local-floor' },
      optionalFeatures: false,
      disableDefaultUI: true,
    });
    const xr = this.xrHelper;

    // Enable controller ray selection and near/hand features
    try {
      this.pointerFeatureRef = xr.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.POINTER_SELECTION,
        'latest',
        { xrInput: xr.input, enablePointerSelectionOnAllControllers: true }
      );
      if (this.pointerFeatureRef) this.pointerFeatureRef.displayLaserPointer = false;
    } catch (_) {}
    try {
      this.nearFeatureRef = xr.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.NEAR_INTERACTION,
        'latest',
        { xrInput: xr.input }
      );
    } catch (_) {}
    try {
      this.handFeatureRef = xr.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.HAND_TRACKING,
        'latest',
        { xrInput: xr.input }
      );
    } catch (_) {}

    // XR state changes
    xr.baseExperience.onStateChangedObservable.add((state) => {
      this.xrActive = state === BABYLON.WebXRState.IN_XR;
      this.xrMode = this.xrActive ? 'ar' : 'none';
      if (this._onXRStateChanged) this._onXRStateChanged(this.xrActive);
      if (this.xrActive) {
        try { this.engine.setHardwareScalingLevel(1.4); } catch (_) {}
        this._attachControllerBindings();
        // If session entered externally, attempt to init camera binding
        try { if (!this._xrGlBinding) this._tryInitRawCameraBinding().then(() => { if (this.rawCameraEnabled) this._enableRawCameraMirror(); }); } catch (_) {}
      } else {
        this._cleanupControllerBindings();
        try { this.engine.setHardwareScalingLevel(1.0); } catch (_) {}
        // Stop experimental camera mirroring on XR exit
        try { this._disableRawCameraMirror(); } catch (_) {}
      }
    });

    // End-of-frame hooks: dynamic scaling and XR preview updates
    this.engine.onEndFrameObservable.add(() => {
      this._tuneHardwareScaling();
      if (this.xrActive && this.previewPlane3d && this.previewPlane3d.isVisible) {
        this._drawPreviewIntoDynamicTexture();
      }
    });

    return scene;
  }

  _drawPreviewIntoDynamicTexture() {
    if (!this.previewDynamicTexture3d) return;
    const mw = this.engine.getRenderWidth(true);
    const mh = this.engine.getRenderHeight(true);
    try {
      const size = this.previewDynamicTexture3d.getSize();
      const dw = (size && size.width) ? size.width : size;
      const dh = (size && size.height) ? size.height : size;
      if (dw !== mw || dh !== mh) {
        try { this.previewDynamicTexture3d.scaleTo(mw, mh); } catch (_) {}
      }
      const dctx = this.previewDynamicTexture3d.getContext();
      dctx.fillStyle = '#000';
      dctx.fillRect(0, 0, mw, mh);
      dctx.drawImage(this.canvas, 0, 0, mw, mh);
      this.previewDynamicTexture3d.update(false);
      if (this.previewPlane3d && !this.previewPlane3d.isVisible) this.previewPlane3d.isVisible = true;
    } catch (_) {}
  }

  _tuneHardwareScaling() {
    if (!this.AUTO_SCALE.enabled || !this.xrActive) return;
    const now = performance.now();
    if (now - this.AUTO_SCALE.lastTunedAt < this.AUTO_SCALE.tuneEveryMs) return;
    this.AUTO_SCALE.lastTunedAt = now;
    let fps = 60;
    try { fps = this.engine.getFps ? this.engine.getFps() : 60; } catch (_) {}
    let level = 1;
    try { level = this.engine.getHardwareScalingLevel ? this.engine.getHardwareScalingLevel() : 1; } catch (_) {}
    if (fps < 58 && level < this.AUTO_SCALE.max) {
      try { this.engine.setHardwareScalingLevel(Math.min(this.AUTO_SCALE.max, level + this.AUTO_SCALE.step)); } catch (_) {}
      return;
    }
    if (fps > 70 && level > this.AUTO_SCALE.min) {
      try { this.engine.setHardwareScalingLevel(Math.max(this.AUTO_SCALE.min, level - this.AUTO_SCALE.step)); } catch (_) {}
    }
  }

  _cleanupControllerBindings() {
    if (!this.controllerCleanupFns || !this.controllerCleanupFns.length) return;
    for (const fn of this.controllerCleanupFns) {
      try { fn && fn(); } catch (_) {}
    }
    this.controllerCleanupFns = [];
  }

  _attachControllerBindings() {
    this._cleanupControllerBindings();
    const xr = this.xrHelper;
    if (!xr || !xr.input) return;

    const onControllerAddedObserver = xr.input.onControllerAddedObservable.add((controller) => {
      try {
        controller.onMotionControllerInitObservable.add((motionController) => {
          try {
            const components = motionController && motionController.components ? Object.values(motionController.components) : [];
            const toId = (c) => (c && (c.id || c.type || c.componentId || '')) + '';
            const findComp = (needle) => components.find((c) => toId(c).toLowerCase().includes(needle));
            const aComp = findComp('a-button') || findComp('primary-button') || findComp('bottom-button');
            const addButtonListener = (comp) => {
              if (!comp || !comp.onButtonStateChangedObservable) return;
              const token = comp.onButtonStateChangedObservable.add((c) => {
                try {
                  const now = performance.now();
                  if (c.changes && c.changes.pressed && c.pressed && now - this._lastInputActionAt > 250) {
                    this._lastInputActionAt = now;
                    if (this._controllerPrimaryHandler) this._controllerPrimaryHandler();
                  }
                } catch (_) {}
              });
              this.controllerCleanupFns.push(() => { try { comp.onButtonStateChangedObservable.remove(token); } catch (_) {} });
            };
            addButtonListener(aComp);
          } catch (_) {}
        });
      } catch (_) {}
    });
    this.controllerCleanupFns.push(() => { try { xr.input.onControllerAddedObservable.remove(onControllerAddedObserver); } catch (_) {} });
  }
}


