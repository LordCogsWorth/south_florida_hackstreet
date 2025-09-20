import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Text as TroikaText } from 'troika-three-text'
import { useAssemblyAIRealtime } from '../hooks/useAssemblyAIRealtime'
import { createMicrophoneProcessor } from '../utils/audio'
import { generateImageViaGemini } from '../utils/gemini'

export default function ARPageTimed() {
  const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY as string | undefined
  const [recording, setRecording] = useState(false)
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
  const generatingRef = useRef<boolean>(false)
  const xrActiveRef = useRef<boolean>(false)
  const overlayGroupRef = useRef<THREE.Group | null>(null)
  const overlayMeshRef = useRef<THREE.Mesh | null>(null)
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

    const hud = new THREE.Group()
    scene.add(hud)
    hudRef.current = hud

    const PANEL_WIDTH = 0.8
    const PANEL_HEIGHT = 0.24
    const PADDING = 0.02
    const bgGeo = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT)
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x001a1a, transparent: true, opacity: 0.35 })
    const bg = new THREE.Mesh(bgGeo, bgMat)
    hud.add(bg)

    const text = new (TroikaText as any)()
    text.text = 'Pulsa Start AR — Transcripción (2s)'
    text.fontSize = 0.028
    text.lineHeight = 1.08
    text.maxWidth = PANEL_WIDTH - PADDING * 2
    text.color = 0x00ffcc as unknown as string
    text.anchorX = 'left'
    text.anchorY = 'middle'
    text.outlineColor = 0x003333 as unknown as string
    text.outlineWidth = 0.002
    text.position.set(-PANEL_WIDTH / 2 + PADDING, 0, 0.001)
    text.sync()
    hud.add(text)
    textRef.current = text

    const boardGroup = new THREE.Group()
    scene.add(boardGroup)
    boardRef.current = boardGroup

    const boardCanvas = document.createElement('canvas')
    boardCanvas.width = 1024
    boardCanvas.height = 1024
    const ctx = boardCanvas.getContext('2d')!
    ctx.fillStyle = 'rgba(10,10,10,0.35)'
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height)
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
    const boardGeo2 = new THREE.PlaneGeometry(BOARD_W, BOARD_H)
    const boardMat = new THREE.MeshBasicMaterial({ map: boardTex, transparent: true })
    const board = new THREE.Mesh(boardGeo2, boardMat)
    boardGroup.add(board)
    boardMeshRef.current = board

    const overlayGroup = new THREE.Group()
    overlayGroup.visible = false
    scene.add(overlayGroup)
    overlayGroupRef.current = overlayGroup
    const overlayPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.98, visible: false }))
    overlayGroup.add(overlayPlane)
    overlayMeshRef.current = overlayPlane

    const bgGroup = new THREE.Group()
    bgGroup.visible = false
    scene.add(bgGroup)
    bgGroupRef.current = bgGroup
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
    const smoothFactor = 0.2
    const DIST = 0.9
    const RIGHT_OFFSET = 0.0
    const LEFT_OFFSET = 0.42
    const UP_OFFSET = 0.02

    const plane = new THREE.Plane()
    const overlayHitPlane = new THREE.Plane()
    const projected = new THREE.Vector3()

    const animate = () => {
      renderer.setAnimationLoop((_: number, frame?: any) => {
        const hud = hudRef.current
        if (hud) {
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          targetPos.copy(forward).applyQuaternion(tmpQuat)
          targetPos.multiplyScalar(DIST)
          targetPos.addScaledVector(up, UP_OFFSET)
          const rightVec = right.clone().applyQuaternion(tmpQuat)
          targetPos.addScaledVector(rightVec, RIGHT_OFFSET)
          targetPos.add(tmpPos)
          hud.position.lerp(targetPos, smoothFactor)
          hud.quaternion.slerp(tmpQuat, smoothFactor)
        }

        const boardGroup = boardRef.current
        if (boardGroup && autoFollowBoardRef.current) {
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          targetPos.copy(forward).applyQuaternion(tmpQuat)
          targetPos.multiplyScalar(DIST)
          const leftVec = right.clone().applyQuaternion(tmpQuat).multiplyScalar(-LEFT_OFFSET)
          targetPos.add(leftVec)
          targetPos.addScaledVector(up, UP_OFFSET)
          targetPos.add(tmpPos)
          boardGroup.position.lerp(targetPos, smoothFactor)
          boardGroup.quaternion.slerp(tmpQuat, smoothFactor)
        }

        if (hud && boardGroup) {
          const world = boardGroup.getWorldPosition(new THREE.Vector3())
          const bq = boardGroup.getWorldQuaternion(new THREE.Quaternion())
          const below = new THREE.Vector3(0, -0.36, 0).applyQuaternion(bq)
          const face = new THREE.Vector3(0, 0, 0.001).applyQuaternion(bq)
          const target = world.clone().add(below).add(face)
          hud.position.lerp(target, smoothFactor)
          hud.quaternion.slerp(bq, smoothFactor)
        }

        const bgGroup = bgGroupRef.current
        if (bgGroup && xrActiveRef.current) {
          camera.getWorldPosition(tmpPos)
          camera.getWorldQuaternion(tmpQuat)
          const DIST_BG = 2.2
          if (!bgAnchorPosRef.current || !bgAnchorQuatRef.current) {
            const base = new THREE.Vector3(0, 0, -1).applyQuaternion(tmpQuat).multiplyScalar(DIST_BG)
            const anchor = base.add(tmpPos.clone())
            bgAnchorPosRef.current = anchor.clone()
            bgAnchorQuatRef.current = tmpQuat.clone()
            bgGroup.position.copy(anchor)
            bgGroup.quaternion.copy(tmpQuat)
          }
        }

        if (frame && (renderer as any).xr?.getSession) {
          const session: any = (renderer as any).xr.getSession()
          const refSpace: any = (renderer as any).xr.getReferenceSpace?.()
          const boardMesh = boardMeshRef.current
          const boardTex = boardTexRef.current
          const boardCanvas = boardCanvasRef.current
          const overlayMesh = overlayMeshRef.current
          if (session && refSpace && boardMesh && boardTex && boardCanvas) {
            const n = new THREE.Vector3(0, 0, 1).applyQuaternion(boardMesh.getWorldQuaternion(new THREE.Quaternion()))
            const p0 = boardMesh.getWorldPosition(new THREE.Vector3())
            plane.setFromNormalAndCoplanarPoint(n, p0)
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

              const isPinching = dist < 0.025
              const wasPinching = !!wasPinchingMapRef.current[handId]
              wasPinchingMapRef.current[handId] = isPinching

              const indexWorld = new THREE.Vector3(ix, iy, iz)
              plane.projectPoint(indexWorld, projected)

              const local = boardMesh.worldToLocal(projected.clone())
              const u = (local.x / (BOARD_W)) + 0.5
              const v = 0.5 - (local.y / (BOARD_H))

              let pinchConsumedForManipulation = false
              const currentGrab = grabbedRef.current
              const overlayM = overlayMeshRef.current
              if (overlayM && xrActiveRef.current) {
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
                    const newPos = overlayProjected.clone().add(currentGrab.offsetWorld)
                    overlayGroup?.position.lerp(newPos, 0.6)
                  } else {
                    grabbedRef.current = null
                    secondHandRef.current = null
                  }
                  pinchConsumedForManipulation = true
                }
              }

              if (boardMesh && xrActiveRef.current && !pinchConsumedForManipulation) {
                const boardProjected = new THREE.Vector3()
                plane.projectPoint(indexWorld, boardProjected)
                const boardLocal = boardMesh.worldToLocal(boardProjected.clone())
                const insideBoard = Math.abs(boardLocal.x) <= BOARD_W / 2 && Math.abs(boardLocal.y) <= BOARD_H / 2
                const planeDistBoard = indexWorld.distanceTo(boardProjected)
                const nearBoard = planeDistBoard < 0.08
                const currentGrab2 = grabbedRef.current
                if (!currentGrab2 && isPinching && !wasPinching && insideBoard && nearBoard) {
                  grabbedRef.current = { type: 'board', handId, offsetWorld: boardMesh.getWorldPosition(new THREE.Vector3()).sub(boardProjected) }
                  autoFollowBoardRef.current = false
                  pinchConsumedForManipulation = true
                } else if (currentGrab2 && currentGrab2.type === 'board' && currentGrab2.handId === handId) {
                  if (isPinching) {
                    const newPos = boardProjected.clone().add(currentGrab2.offsetWorld)
                    boardGroup?.position.lerp(newPos, 0.6)
                  } else {
                    grabbedRef.current = null
                  }
                  pinchConsumedForManipulation = true
                }
              }

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
    text.text = full || 'Listo para transcribir en AR (2s)'
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
    try {
      const current = (renderer as any).xr.getSession?.()
      if (current) {
        console.log('XR session already active')
        return
      }
    } catch {}
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
          if (captureIntervalRef.current) {
            window.clearInterval(captureIntervalRef.current)
          }
          const takeCapture = () => {
            try {
              const canvas = renderer.domElement as HTMLCanvasElement
              canvas.toBlob((blob) => {
                if (blob) {
                  capturesRef.current.push(blob)
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

  const buildPrompt = () => {
    const lastPartial = partial
    const joinedFinals = finals.slice(-2).join(' ').slice(-200)
    const content = (joinedFinals + ' ' + lastPartial).trim()
    if (!content) return ''
    return `Genera una imagen clara y sencilla (estilo boceto) sobre: ${content}. Fondo transparente u oscuro, alta legibilidad en pizarra.`
  }

  // Fixed 2s generation loop regardless of transcript relevance
  useEffect(() => {
    const key = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined
    if (!key) return
    if (imageIntervalRef.current) window.clearInterval(imageIntervalRef.current)
    imageIntervalRef.current = window.setInterval(async () => {
      if (generatingRef.current) return
      const prompt = buildPrompt() || 'Ilustra el tema actual de la conversación.'
      generatingRef.current = true
      try {
        const img = await generateImageViaGemini(key, prompt)
        if (img) {
          const bgGroup = bgGroupRef.current
          if (bgGroup) {
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
            const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65, map: tex }))
            const mainHeight = 1.1
            const mainWidth = mainHeight * aspect
            quad.scale.set(mainWidth, mainHeight, 1)
            bgGroup.add(quad)
            bgMeshesRef.current.push(quad)

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

            const meshes = bgMeshesRef.current
            const count = meshes.length
            const mainIndex = count - 1
            const main = meshes[mainIndex]
            const ringRadius = (main.scale.x + main.scale.y) * 0.45
            main.position.set(0, 0, 0)
            main.scale.set(main.scale.x * 1.1, main.scale.y * 1.1, 1)
            {
              const mat = main.material as THREE.MeshBasicMaterial
              mat.transparent = true
              mat.opacity = 1.0
              mat.needsUpdate = true
            }
            const others = meshes.slice(0, -1)
            const twoPi = Math.PI * 2
            const step = others.length > 0 ? twoPi / others.length : 0
            for (let i = 0; i < others.length; i++) {
              const m = others[i]
              const angle = i * step
              const x = Math.cos(angle) * ringRadius
              const y = Math.sin(angle) * (ringRadius * 0.6)
              m.position.set(x, y, -0.001)
              const sx = Math.max(0.25, m.scale.x * 0.8)
              const sy = Math.max(0.25, m.scale.y * 0.8)
              m.scale.set(sx, sy, 1)
              const mat = m.material as THREE.MeshBasicMaterial
              mat.transparent = true
              mat.opacity = 0.65
              mat.needsUpdate = true
            }

            bgGroup.visible = xrActiveRef.current
          }
        }
      } catch (e) {
        console.warn('Gemini draw failed', e)
      } finally {
        generatingRef.current = false
      }
    }, 2000)
    return () => {
      if (imageIntervalRef.current) {
        window.clearInterval(imageIntervalRef.current)
        imageIntervalRef.current = null
      }
    }
  }, [partial, finals])

  return (
    <div style={{ width: '100%', height: '100vh', background: 'transparent' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'fixed', left: 12, bottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={startAR}>Start AR</button>
        <button onClick={recording ? stopTranscription : startTranscription}>
          {recording ? 'Detener' : 'Iniciar'}
        </button>
        <span style={{ color: '#0ff' }}>Estado: {connected ? 'Conectado' : 'Desconectado'}</span>
        <button onClick={() => { setShowBoard((v) => !v); if (boardRef.current) boardRef.current.visible = !showBoard }}>Toggle Board</button>
        <button onClick={() => { setShowTranscript((v) => !v); if (hudRef.current) hudRef.current.visible = !showTranscript }}>Toggle Transcript</button>
        <button onClick={() => {
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


