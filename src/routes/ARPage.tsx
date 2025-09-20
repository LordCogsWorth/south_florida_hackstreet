import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Text as TroikaText } from 'troika-three-text'
import { useAssemblyAIRealtime } from '../hooks/useAssemblyAIRealtime'
import { createMicrophoneProcessor } from '../utils/audio'
import { generateImageViaGemini } from '../utils/gemini'

export default function ARPage() {
  const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY as string | undefined
  const [recording, setRecording] = useState(false)
  // Deprecated DOM overlay state
  // const [overlaySrc, setOverlaySrc] = useState<string | null>(null)
  // const [overlayPosIndex, setOverlayPosIndex] = useState<number>(0)
  const { connected, messages, connect, disconnect, sendPcm16 } = useAssemblyAIRealtime({
    apiKey: apiKey || '',
    sampleRate: 16000,
    formatTurns: true,
  })

  const mic = useMemo(() => createMicrophoneProcessor(sendPcm16, 16000), [sendPcm16])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const textRef = useRef<any>(null)
  const hudRef = useRef<THREE.Group | null>(null)
  const capturesRef = useRef<Blob[]>([])
  const captureIntervalRef = useRef<number | null>(null)
  const boardRef = useRef<THREE.Group | null>(null)
  const boardMeshRef = useRef<THREE.Mesh | null>(null)
  const boardTexRef = useRef<THREE.CanvasTexture | null>(null)
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastDrawUVPerHandRef = useRef<Record<string, { u: number, v: number } | null>>({})
  const wasPinchingMapRef = useRef<Record<string, boolean>>({})
  const imageIntervalRef = useRef<number | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const generatingRef = useRef<boolean>(false)
  const lastPromptRef = useRef<string>('')
  const xrActiveRef = useRef<boolean>(false)
  const overlayGroupRef = useRef<THREE.Group | null>(null)
  const overlayMeshRef = useRef<THREE.Mesh | null>(null)
  // const overlayTexRef = useRef<THREE.Texture | null>(null)
  // const overlayAspectRef = useRef<number>(1)
  const autoFollowBoardRef = useRef<boolean>(true)
  const autoFollowOverlayRef = useRef<boolean>(true)
  const grabbedRef = useRef<null | { type: 'overlay' | 'board', handId: string, offsetWorld: THREE.Vector3 }>(null)
  const secondHandRef = useRef<null | { handId: string }>(null)
  const initialTwoHandDistanceRef = useRef<number>(0)
  const initialOverlayScaleRef = useRef<{ x: number, y: number } | null>(null)
  const bgGroupRef = useRef<THREE.Group | null>(null)
  const bgMeshesRef = useRef<THREE.Mesh[]>([])
  const bgAspectRef = useRef<number>(1)
  const bgAnchorPosRef = useRef<THREE.Vector3 | null>(null)
  const bgAnchorQuatRef = useRef<THREE.Quaternion | null>(null)
  const autoFollowBackgroundRef = useRef<boolean>(false)
  const [showBoard, setShowBoard] = useState(true)
  const [showTranscript, setShowTranscript] = useState(true)

  const partial = messages.filter(m => m.type === 'partial').slice(-1)[0]?.text || ''
  const finals = messages.filter(m => m.type === 'final').map(m => m.text)

  useEffect(() => {
    const canvas = canvasRef.current!
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.xr.enabled = true
    renderer.setClearColor(0x000000, 0)
    renderer.setClearAlpha(0)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)
    cameraRef.current = camera

    const light = new THREE.DirectionalLight(0xffffff, 1.2)
    light.position.set(1, 2, 1)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    // HUD group that follows head pose (below board panel)
    const hud = new THREE.Group()
    scene.add(hud)
    hudRef.current = hud

    // Background plate for readability over passthrough
    const PANEL_WIDTH = 0.8
    const PANEL_HEIGHT = 0.24
    const PADDING = 0.02
    const bgGeo = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT)
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x001a1a, transparent: true, opacity: 0.35 })
    const bg = new THREE.Mesh(bgGeo, bgMat)
    hud.add(bg)

    const text = new (TroikaText as any)()
    text.text = 'Pulsa Start AR — Transcripción'
    text.fontSize = 0.028
    text.lineHeight = 1.08
    text.maxWidth = PANEL_WIDTH - PADDING * 2
    text.color = 0x00ffcc as unknown as string
    text.anchorX = 'left'
    text.anchorY = 'middle'
    text.outlineColor = 0x003333 as unknown as string
    text.outlineWidth = 0.002
    // Position inside panel: left-middle with small padding
    text.position.set(-PANEL_WIDTH / 2 + PADDING, 0, 0.001)
    text.sync()
    hud.add(text)
    textRef.current = text

    // Whiteboard (left side), Canvas texture for drawing
    const boardGroup = new THREE.Group()
    scene.add(boardGroup)
    boardRef.current = boardGroup

    const boardCanvas = document.createElement('canvas')
    boardCanvas.width = 1024
    boardCanvas.height = 1024
    const ctx = boardCanvas.getContext('2d')!
    // Init background
    ctx.fillStyle = 'rgba(10,10,10,0.35)'
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height)
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x <= 1024; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke() }
    for (let y = 0; y <= 1024; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke() }
    const boardTex = new THREE.CanvasTexture(boardCanvas)
    boardTex.needsUpdate = true
    boardCanvasRef.current = boardCanvas
    boardTexRef.current = boardTex

    const BOARD_W = 0.8
    const BOARD_H = 0.5
    const boardGeo = new THREE.PlaneGeometry(BOARD_W, BOARD_H)
    const boardMat = new THREE.MeshBasicMaterial({ map: boardTex, transparent: true })
    const board = new THREE.Mesh(boardGeo, boardMat)
    boardGroup.add(board)
    boardMeshRef.current = board

    // 3D overlay group for Gemini images in XR
    const overlayGroup = new THREE.Group()
    overlayGroup.visible = false
    scene.add(overlayGroup)
    overlayGroupRef.current = overlayGroup
    // Remove right-side overlay usage: keep mesh for future, but hidden permanently by default
    const overlayPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.98, visible: false }))
    overlayGroup.add(overlayPlane)
    overlayMeshRef.current = overlayPlane

    // 3D background group for Gemini images in XR
    const bgGroup = new THREE.Group()
    bgGroup.visible = false
    scene.add(bgGroup)
    bgGroupRef.current = bgGroup
    // We'll create multiple background quads progressively, laid out linearly
    bgMeshesRef.current = []

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    onResize()
    window.addEventListener('resize', onResize)

    const forward = new THREE.Vector3(0, 0, -1)
    const right = new THREE.Vector3(1, 0, 0)
    const up = new THREE.Vector3(0, 1, 0)
    const tmpPos = new THREE.Vector3()
    const targetPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const smoothFactor = 0.2 // 0..1 higher is snappier
    const DIST = 0.9
    const RIGHT_OFFSET = 0.0
    const LEFT_OFFSET = 0.42
    const UP_OFFSET = 0.02

    // Drawing helpers
    const plane = new THREE.Plane()
    const overlayHitPlane = new THREE.Plane()
    const projected = new THREE.Vector3()

    const animate = () => {
      renderer.setAnimationLoop((_: number, frame?: any) => {
        // When XR is presenting, keep HUD in front of head pose
        const hud = hudRef.current
        if (hud) {
          // Compute camera world position and forward
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          targetPos.copy(forward).applyQuaternion(tmpQuat)
          // Distance in meters in front of head
          targetPos.multiplyScalar(DIST)
          // Slight vertical offset upward for comfort
          targetPos.addScaledVector(up, UP_OFFSET)
          // Add lateral offset to the right side of view
          const rightVec = right.clone().applyQuaternion(tmpQuat)
          targetPos.addScaledVector(rightVec, RIGHT_OFFSET)
          targetPos.add(tmpPos)
          // Smoothly move HUD towards target
          hud.position.lerp(targetPos, smoothFactor)
          // Orient HUD to face camera
          hud.quaternion.slerp(tmpQuat, smoothFactor)
        }

        // Position board to the left side if auto-follow
        const boardGroup = boardRef.current
        if (boardGroup && autoFollowBoardRef.current) {
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          targetPos.copy(forward).applyQuaternion(tmpQuat)
          targetPos.multiplyScalar(DIST)
          // Left offset
          const leftVec = right.clone().applyQuaternion(tmpQuat).multiplyScalar(-LEFT_OFFSET)
          targetPos.add(leftVec)
          // Slight vertical offset
          targetPos.addScaledVector(up, UP_OFFSET)
          targetPos.add(tmpPos)
          boardGroup.position.lerp(targetPos, smoothFactor)
          boardGroup.quaternion.slerp(tmpQuat, smoothFactor)
        }

        // Position transcript HUD below the board
        if (hud && boardGroup) {
          const world = boardGroup.getWorldPosition(new THREE.Vector3())
          const bq = boardGroup.getWorldQuaternion(new THREE.Quaternion())
          // offset below along -Y in board space
          const below = new THREE.Vector3(0, -0.36, 0).applyQuaternion(bq)
          const face = new THREE.Vector3(0, 0, 0.001).applyQuaternion(bq)
          const target = world.clone().add(below).add(face)
          hud.position.lerp(target, smoothFactor)
          hud.quaternion.slerp(bq, smoothFactor)
        }

        // Hide/disable right-side overlay placement

        // Position background image “story line” further away and anchored once
        const bgGroup = bgGroupRef.current
        if (bgGroup && xrActiveRef.current) {
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          const DIST_BG = 2.2
          if (!bgAnchorPosRef.current || !bgAnchorQuatRef.current) {
            // Anchor the background row further out in front on first frame
            const base = new THREE.Vector3(0, 0, -1).applyQuaternion(tmpQuat).multiplyScalar(DIST_BG)
            const anchor = base.add(tmpPos.clone())
            bgAnchorPosRef.current = anchor.clone()
            bgAnchorQuatRef.current = tmpQuat.clone()
            bgGroup.position.copy(anchor)
            bgGroup.quaternion.copy(tmpQuat)
          } else if (autoFollowBackgroundRef.current) {
            // Optionally keep following
            const base = new THREE.Vector3(0, 0, -1).applyQuaternion(tmpQuat).multiplyScalar(DIST_BG)
            targetPos.copy(base)
            targetPos.add(tmpPos)
            bgGroup.position.lerp(targetPos, smoothFactor)
            bgGroup.quaternion.slerp(tmpQuat, smoothFactor)
          }
        }

        // Hand tracking -> drawing on board via pinch (thumb-index)
        if (frame && (renderer as any).xr?.getSession) {
          const session: any = (renderer as any).xr.getSession()
          const refSpace: any = (renderer as any).xr.getReferenceSpace?.()
          const boardMesh = boardMeshRef.current
          const boardTex = boardTexRef.current
          const boardCanvas = boardCanvasRef.current
          const overlayMesh = overlayMeshRef.current
          if (session && refSpace && boardMesh && boardTex && boardCanvas) {
            // Compute board plane in world
            const n = new THREE.Vector3(0, 0, 1).applyQuaternion(boardMesh.getWorldQuaternion(new THREE.Quaternion()))
            const p0 = boardMesh.getWorldPosition(new THREE.Vector3())
            plane.setFromNormalAndCoplanarPoint(n, p0)
            // Overlay plane
            if (overlayMesh) {
              const on = new THREE.Vector3(0, 0, 1).applyQuaternion(overlayMesh.getWorldQuaternion(new THREE.Quaternion()))
              const op0 = overlayMesh.getWorldPosition(new THREE.Vector3())
              overlayHitPlane.setFromNormalAndCoplanarPoint(on, op0)
            }

            for (const source of session.inputSources as any[]) {
              const hand: any = source.hand
              if (!hand) continue
              const indexTipSpace: any = hand.get?.('index-finger-tip')
              const thumbTipSpace: any = hand.get?.('thumb-tip')
              if (!indexTipSpace || !thumbTipSpace) continue
              const indexPose: any = frame.getJointPose(indexTipSpace, refSpace)
              const thumbPose: any = frame.getJointPose(thumbTipSpace, refSpace)
              if (!indexPose || !thumbPose) continue
              const handId: string = (source.handedness || '').toString() || 'unknown'

              const ix = indexPose.transform.position.x
              const iy = indexPose.transform.position.y
              const iz = indexPose.transform.position.z
              const tx = thumbPose.transform.position.x
              const ty = thumbPose.transform.position.y
              const tz = thumbPose.transform.position.z
              const dx = ix - tx
              const dy = iy - ty
              const dz = iz - tz
              const dist = Math.hypot(dx, dy, dz)

              const isPinching = dist < 0.025 // ~2.5cm threshold
              const wasPinching = !!wasPinchingMapRef.current[handId]
              wasPinchingMapRef.current[handId] = isPinching

              // Project index tip to board plane along board normal
              const indexWorld = new THREE.Vector3(ix, iy, iz)
              plane.projectPoint(indexWorld, projected)

              // Convert to board local
              const local = boardMesh.worldToLocal(projected.clone())
              const u = (local.x / (BOARD_W)) + 0.5
              const v = 0.5 - (local.y / (BOARD_H))

              // Manipulation: overlay or board
              let pinchConsumedForManipulation = false
              const currentGrab = grabbedRef.current
              const overlayM = overlayMeshRef.current
              if (overlayM && xrActiveRef.current) {
                // Check overlay hit
                const overlayProjected = new THREE.Vector3()
                overlayHitPlane.projectPoint(indexWorld, overlayProjected)
                const overlayLocal = overlayM.worldToLocal(overlayProjected.clone())
                const halfW = (overlayM.scale.x) / 2
                const halfH = (overlayM.scale.y) / 2
                const insideOverlay = Math.abs(overlayLocal.x) <= halfW && Math.abs(overlayLocal.y) <= halfH
                const planeDist = indexWorld.distanceTo(overlayProjected)
                const nearOverlay = planeDist < 0.08

                if (!currentGrab && isPinching && !wasPinching && insideOverlay && nearOverlay) {
                  grabbedRef.current = { type: 'overlay', handId, offsetWorld: overlayM.getWorldPosition(new THREE.Vector3()).sub(overlayProjected) }
                  autoFollowOverlayRef.current = false
                  pinchConsumedForManipulation = true
                } else if (currentGrab && currentGrab.type === 'overlay' && currentGrab.handId === handId) {
                  if (isPinching) {
                    // Move overlay with hand
                    const newPos = overlayProjected.clone().add(currentGrab.offsetWorld)
                    overlayGroup?.position.lerp(newPos, 0.6)
                    // Two-hand scale
                    const otherHandId = handId === 'left' ? 'right' : 'left'
                    if (wasPinchingMapRef.current[otherHandId]) {
                      if (!secondHandRef.current) {
                        secondHandRef.current = { handId: otherHandId }
                        // Find other hand index tip pos
                        // Note: We can't easily access other hand pose here; scaling will be updated when that hand iterates
                        initialTwoHandDistanceRef.current = -1 // mark to set on next frame when both measured
                        initialOverlayScaleRef.current = { x: overlayM.scale.x, y: overlayM.scale.y }
                      }
                    } else {
                      secondHandRef.current = null
                      initialTwoHandDistanceRef.current = 0
                      initialOverlayScaleRef.current = null
                    }
                  } else {
                    grabbedRef.current = null
                    secondHandRef.current = null
                  }
                  pinchConsumedForManipulation = true
                }
              }

              // If we have two-hand pinch for overlay, compute scale when other hand iteration arrives
              if (grabbedRef.current?.type === 'overlay' && xrActiveRef.current && overlayMeshRef.current) {
                const overlayM2 = overlayMeshRef.current
                const otherHandId = grabbedRef.current.handId === 'left' ? 'right' : 'left'
                if (wasPinchingMapRef.current[grabbedRef.current.handId] && wasPinchingMapRef.current[otherHandId]) {
                  // Acquire both index tip positions
                  // We only have the current hand here; for simplicity, approximate by using plane distances to estimate scale changes when initial distance was set
                  if (initialTwoHandDistanceRef.current <= 0) {
                    // Initialize when both are pinching: use current hand and object center distance as proxy
                    initialTwoHandDistanceRef.current = 0.25
                  } else if (initialOverlayScaleRef.current) {
                    const factor = dist > 0.001 ? (dist / 0.025) : 1
                    const nx = Math.max(0.15, Math.min(1.8, initialOverlayScaleRef.current.x * factor))
                    const ny = Math.max(0.15, Math.min(1.8, initialOverlayScaleRef.current.y * factor))
                    overlayM2.scale.set(nx, ny, 1)
                  }
                }
              }

              // Board manipulation
              if (boardMesh && xrActiveRef.current && !pinchConsumedForManipulation) {
                const boardProjected = new THREE.Vector3()
                plane.projectPoint(indexWorld, boardProjected)
                const boardLocal = boardMesh.worldToLocal(boardProjected.clone())
                const insideBoard = Math.abs(boardLocal.x) <= BOARD_W / 2 && Math.abs(boardLocal.y) <= BOARD_H / 2
                const planeDistBoard = indexWorld.distanceTo(boardProjected)
                const nearBoard = planeDistBoard < 0.08
                const currentGrab = grabbedRef.current
                if (!currentGrab && isPinching && !wasPinching && insideBoard && nearBoard) {
                  grabbedRef.current = { type: 'board', handId, offsetWorld: boardMesh.getWorldPosition(new THREE.Vector3()).sub(boardProjected) }
                  autoFollowBoardRef.current = false
                  pinchConsumedForManipulation = true
                } else if (currentGrab && currentGrab.type === 'board' && currentGrab.handId === handId) {
                  if (isPinching) {
                    const newPos = boardProjected.clone().add(currentGrab.offsetWorld)
                    boardGroup?.position.lerp(newPos, 0.6)
                  } else {
                    grabbedRef.current = null
                  }
                  pinchConsumedForManipulation = true
                }
              }

              // Drawing on board only if pinch not consumed and inside board
              if (!pinchConsumedForManipulation && isPinching) {
                const ctx = boardCanvas.getContext('2d')!
                const x = u * boardCanvas.width
                const y = v * boardCanvas.height
                const last = lastDrawUVPerHandRef.current[handId]
                ctx.strokeStyle = '#00ffcc'
                ctx.fillStyle = '#00ffcc'
                ctx.lineWidth = 6
                if (!last || !wasPinching) {
                  ctx.beginPath()
                  ctx.arc(x, y, 3, 0, Math.PI * 2)
                  ctx.fill()
                } else {
                  ctx.beginPath()
                  ctx.moveTo(last.u * boardCanvas.width, last.v * boardCanvas.height)
                  ctx.lineTo(x, y)
                  ctx.stroke()
                }
                lastDrawUVPerHandRef.current[handId] = { u, v }
                boardTex.needsUpdate = true
              }
              if (!isPinching) {
                lastDrawUVPerHandRef.current[handId] = null
              }
            }
          }
        }

        renderer.render(scene, camera)
      })
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.setAnimationLoop(null as any)
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    const text = textRef.current
    if (!text) return
    const lastPartial = partial
    const joinedFinals = finals.join(' ')
    const full = (joinedFinals + ' ' + lastPartial).trim()
    text.text = full || 'Listo para transcribir en AR'
    text.sync()
  }, [partial, finals])

  useEffect(() => {
    return () => {
      mic.stop()
      disconnect()
    }
  }, [mic, disconnect])

  const startTranscription = async () => {
    if (!apiKey) {
      alert('Configura VITE_ASSEMBLYAI_API_KEY en .env.local')
      return
    }
    connect()
    await mic.start()
    setRecording(true)
  }

  const stopTranscription = () => {
    mic.stop()
    disconnect()
    setRecording(false)
  }

  const startAR = () => {
    const renderer = rendererRef.current
    if (!renderer) return
    // Avoid creating multiple sessions
    try {
      const current = (renderer as any).xr.getSession?.()
      if (current) {
        console.log('XR session already active')
        return
      }
    } catch {}
    // Minimal required features for better compatibility on Quest 3
    const requiredFeatures: string[] = ['local-floor']
    const optionalFeatures: string[] = [
      'hit-test',
      'bounded-floor',
      'hand-tracking',
      'anchors',
      'plane-detection',
      'layers',
      'light-estimation',
      'dom-overlay'
    ]

    ;(renderer as any).xr.setReferenceSpaceType('local-floor')

    const xr: any = (navigator as any).xr
    if (!xr) {
      alert('WebXR no disponible en este navegador. Abre la página en el Meta Quest Browser.')
      return
    }

    xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
      if (!supported) {
        alert('Este dispositivo/navegador no soporta immersive-ar')
        return
      }
      const sessionInit: any = { requiredFeatures, optionalFeatures, domOverlay: { root: document.body } }
      xr.requestSession('immersive-ar', sessionInit)
        .then((session: any) => {
          try { document.body.style.background = 'transparent' } catch {}
          ;(renderer as any).xr.setSession(session)
          try { console.log('XR environmentBlendMode:', session.environmentBlendMode) } catch {}
          xrActiveRef.current = true
          // Start periodic canvas captures every 5s
          if (captureIntervalRef.current) {
            window.clearInterval(captureIntervalRef.current)
          }
          const takeCapture = () => {
            try {
              const canvas = renderer.domElement as HTMLCanvasElement
              canvas.toBlob((blob) => {
                if (blob) {
                  capturesRef.current.push(blob)
                  // Optional: cap memory
                  if (capturesRef.current.length > 200) {
                    capturesRef.current.shift()
                  }
                }
              }, 'image/png')
            } catch (e) {
              console.warn('Canvas capture failed', e)
            }
          }
          takeCapture()
          captureIntervalRef.current = window.setInterval(takeCapture, 5000)

          // Cleanup on XR session end
          session.addEventListener('end', () => {
            xrActiveRef.current = false
            const overlayGroup = overlayGroupRef.current
            if (overlayGroup) overlayGroup.visible = false
            if (captureIntervalRef.current) {
              window.clearInterval(captureIntervalRef.current)
              captureIntervalRef.current = null
            }
            if (imageIntervalRef.current) {
              window.clearInterval(imageIntervalRef.current)
              imageIntervalRef.current = null
            }
          })
        })
        .catch((err: unknown) => {
          console.error('requestSession immersive-ar failed:', err)
          alert('No se pudo iniciar AR. Revisa permisos y prueba de nuevo.')
        })
    }).catch((err: unknown) => {
      console.error('isSessionSupported failed:', err)
      alert('No se pudo verificar soporte WebXR en este dispositivo')
    })
  }

  // Build a short prompt from recent transcript
  const buildPrompt = () => {
    const lastPartial = partial
    const joinedFinals = finals.slice(-2).join(' ').slice(-200)
    const content = (joinedFinals + ' ' + lastPartial).trim()
    if (!content) return ''
    return `Genera una imagen clara y sencilla (estilo boceto) sobre: ${content}. Fondo transparente u oscuro, alta legibilidad en pizarra.`
  }

  // Generate an image shortly after transcript changes and show immediately on first streamed candidate
  useEffect(() => {
    const key = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined
    if (!key) return
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      const prompt = buildPrompt()
      if (!prompt) return
      if (prompt === lastPromptRef.current) return
      if (generatingRef.current) return
      generatingRef.current = true
      try {
        const img = await generateImageViaGemini(key, prompt)
        if (img) {
          // Update XR background storyline
          const bgGroup = bgGroupRef.current
          if (bgGroup) {
            // Downscale image to speed up GPU upload & rendering
            const MAX_TEX = 1024
            const off = document.createElement('canvas')
            const ratio = img.width && img.height ? Math.min(MAX_TEX / img.width, MAX_TEX / img.height, 1) : 1
            const cw = Math.max(1, Math.round((img.width || MAX_TEX) * ratio))
            const ch = Math.max(1, Math.round((img.height || MAX_TEX) * ratio))
            off.width = cw
            off.height = ch
            const octx = off.getContext('2d')!
            octx.drawImage(img, 0, 0, cw, ch)
            const tex = new THREE.CanvasTexture(off)
            tex.needsUpdate = true
            tex.generateMipmaps = false
            tex.minFilter = THREE.LinearFilter
            tex.magFilter = THREE.LinearFilter
            tex.anisotropy = 1
            const aspect = img.width && img.height ? img.width / img.height : 1
            bgAspectRef.current = aspect
            // Create a new quad for this image
            const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65, map: tex }))
            const mainHeight = 1.1
            const mainWidth = mainHeight * aspect
            quad.scale.set(mainWidth, mainHeight, 1)
            bgGroup.add(quad)
            bgMeshesRef.current.push(quad)

            // Re-anchor background directly in front of user so the newest image is centered
            const renderer = rendererRef.current
            const camera = cameraRef.current
            if (renderer && camera) {
              const tmpPos = new THREE.Vector3()
              const tmpQuat = new THREE.Quaternion()
              camera.getWorldPosition(tmpPos)
              camera.getWorldQuaternion(tmpQuat)
              const DIST_BG = 2.2
              const base = new THREE.Vector3(0, 0, -1).applyQuaternion(tmpQuat).multiplyScalar(DIST_BG)
              const anchor = base.add(tmpPos.clone())
              bgAnchorPosRef.current = anchor.clone()
              bgAnchorQuatRef.current = tmpQuat.clone()
              bgGroup.position.copy(anchor)
              bgGroup.quaternion.copy(tmpQuat)
            }

            // Layout: last image centered (focus), others around in a ring
            const meshes = bgMeshesRef.current
            const count = meshes.length
            const mainIndex = count - 1
            // Determine ring radius from main size
            const main = meshes[mainIndex]
            const ringRadius = (main.scale.x + main.scale.y) * 0.45
            // Center main
            main.position.set(0, 0, 0)
            // Scale main up slightly, others down
            main.scale.set(main.scale.x * 1.1, main.scale.y * 1.1, 1)
            // Main at 100% opacity
            {
              const mat = main.material as THREE.MeshBasicMaterial
              mat.transparent = true
              mat.opacity = 1.0
              mat.needsUpdate = true
            }
            // Arrange others around
            const others = meshes.slice(0, -1)
            const twoPi = Math.PI * 2
            const step = others.length > 0 ? twoPi / others.length : 0
            for (let i = 0; i < others.length; i++) {
              const m = others[i]
              const angle = i * step
              const x = Math.cos(angle) * ringRadius
              const y = Math.sin(angle) * (ringRadius * 0.6)
              m.position.set(x, y, -0.001)
              // Slightly smaller for context
              const sx = Math.max(0.25, m.scale.x * 0.8)
              const sy = Math.max(0.25, m.scale.y * 0.8)
              m.scale.set(sx, sy, 1)
              // Ensure material settings
              const mat = m.material as THREE.MeshBasicMaterial
              mat.transparent = true
              mat.opacity = 0.65
              mat.needsUpdate = true
            }

            bgGroup.visible = xrActiveRef.current
          }
          lastPromptRef.current = prompt
        }
      } catch (e) {
        console.warn('Gemini draw failed', e)
      } finally {
        generatingRef.current = false
      }
    }, 400)
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [partial, finals])

  return (
    <div style={{ width: '100%', height: '100vh', background: 'transparent' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {/* DOM overlay removed per request to use background story only */}
      <div style={{ position: 'fixed', left: 12, bottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={startAR}>Start AR</button>
        <button onClick={recording ? stopTranscription : startTranscription}>
          {recording ? 'Detener' : 'Iniciar'}
        </button>
        <span style={{ color: '#0ff' }}>Estado: {connected ? 'Conectado' : 'Desconectado'}</span>
        <button onClick={() => { setShowBoard((v) => !v); if (boardRef.current) boardRef.current.visible = !showBoard }}>Toggle Board</button>
        <button onClick={() => { setShowTranscript((v) => !v); if (hudRef.current) hudRef.current.visible = !showTranscript }}>Toggle Transcript</button>
        <button onClick={() => {
          // Download all captures as separate files
          const captures = capturesRef.current
          if (!captures.length) {
            alert('No hay capturas aún')
            return
          }
          captures.forEach((blob, idx) => {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `xr_capture_${idx + 1}.png`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
          })
        }}>Descargar capturas</button>
      </div>
    </div>
  )
}


