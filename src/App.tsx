import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { createMicrophoneProcessor } from './utils/audio'
import { useAssemblyAIRealtime } from './hooks/useAssemblyAIRealtime'

function App() {
  const apiKey = import.meta.env.VITE_ASSEMBLYAI_API_KEY as string | undefined
  const [recording, setRecording] = useState(false)

  const { connected, messages, connect, disconnect, sendPcm16 } = useAssemblyAIRealtime({
    apiKey: apiKey || '',
    sampleRate: 16000,
    formatTurns: true,
  })

  const mic = useMemo(() => createMicrophoneProcessor(sendPcm16, 16000), [sendPcm16])

  useEffect(() => {
    return () => {
      mic.stop()
      disconnect()
    }
  }, [mic, disconnect])

  const start = async () => {
    if (!apiKey) {
      alert('Configura VITE_ASSEMBLYAI_API_KEY en .env.local')
      return
    }
    connect()
    await mic.start()
    setRecording(true)
  }

  const stop = () => {
    mic.stop()
    disconnect()
    setRecording(false)
  }

  const partial = messages.filter(m => m.type === 'partial').slice(-1)[0]?.text || ''
  const finals = messages.filter(m => m.type === 'final').map(m => m.text)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Transcripción en Tiempo Real (AssemblyAI)</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={recording ? stop : start}>
          {recording ? 'Detener' : 'Iniciar'}
        </button>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Estado: {connected ? 'Conectado' : 'Desconectado'}</span>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minHeight: 160 }}>
        {finals.length === 0 && !partial && (
          <div style={{ color: '#888' }}>Pulsa “Iniciar” y empieza a hablar…</div>
        )}
        {finals.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {finals.map((line, i) => (
              <div key={i} style={{ marginBottom: 6 }}>{line}</div>
            ))}
          </div>
        )}
        {partial && (
          <div style={{ color: '#555' }}>
            <em>{partial}</em>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        Nota: Para producción, usa tokens efímeros en vez de exponer la API key en el frontend.
      </div>
    </div>
  )
}

export default App
