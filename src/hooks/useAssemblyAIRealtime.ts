import { useCallback, useEffect, useRef, useState } from 'react'
import { pcm16ToBase64 } from '../utils/audio'

type TranscriptMessage = {
  type: 'partial' | 'final' | 'info' | 'error';
  text: string;
};

type UseAssemblyAIRealtimeOptions = {
  apiKey: string;
  sampleRate?: number; // default 16000
  formatTurns?: boolean; // request formatted final transcripts
};

export function useAssemblyAIRealtime({ apiKey, sampleRate = 16000, formatTurns = true }: UseAssemblyAIRealtimeOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }
    // AssemblyAI realtime v3 endpoint with query params.
    // For the browser, we pass the API key via token query parameter for MVP.
    const qs = new URLSearchParams({ sample_rate: String(sampleRate), format_turns: formatTurns ? 'true' : 'false', token: apiKey })
    const url = `wss://streaming.assemblyai.com/v3/ws?${qs.toString()}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setMessages((prev) => prev.concat({ type: 'info', text: 'Conectado a AssemblyAI' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const msgType: string = data.type || ''
        if (msgType === 'Begin') {
          setMessages((prev) => prev.concat({ type: 'info', text: 'Sesión iniciada' }))
        } else if (msgType === 'Turn') {
          const transcript: string = data.transcript || data.text || ''
          const formatted: boolean = !!data.turn_is_formatted
          setMessages((prev) => prev.concat({ type: formatted ? 'final' : 'partial', text: transcript }))
        } else if (msgType === 'Termination') {
          setMessages((prev) => prev.concat({ type: 'info', text: 'Sesión terminada' }))
        } else if (data.error) {
          setMessages((prev) => prev.concat({ type: 'error', text: String(data.error) }))
        }
      } catch (e) {
        // ignore parsing errors for MVP
      }
    }

    ws.onerror = () => {
      setMessages((prev) => prev.concat({ type: 'error', text: 'Error WebSocket' }))
    }

    ws.onclose = () => {
      setConnected(false)
      setMessages((prev) => prev.concat({ type: 'info', text: 'Desconectado' }))
      wsRef.current = null
    }
  }, [apiKey, sampleRate, formatTurns])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
      wsRef.current = null
    }
  }, [])

  const sendPcm16 = useCallback((chunkBuffer: ArrayBuffer) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    // v3 supports sending raw binary PCM; fallback to JSON/base64 if needed
    try {
      ws.send(chunkBuffer)
    } catch {
      const base64Chunk = pcm16ToBase64(new Int16Array(chunkBuffer))
      const payload = { audio_data: base64Chunk }
      ws.send(JSON.stringify(payload))
    }
  }, [])

  // Keep alive ping
  useEffect(() => {
    const interval = setInterval(() => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'KeepAlive' }))
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return { connected, messages, connect, disconnect, sendPcm16 }
}

export type { TranscriptMessage }


