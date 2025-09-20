export async function generateImageViaGemini(apiKey: string, prompt: string): Promise<HTMLImageElement | null> {
  try {
    const modelId = 'gemini-2.5-flash-image-preview'
    const endpoint = 'streamGenerateContent'
           const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${endpoint}?key=${encodeURIComponent(apiKey)}`

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
             generationConfig: {
               responseModalities: ['IMAGE'],
               // Hints for faster responses
               temperature: 0.2,
               topK: 32,
               topP: 0.8,
               candidateCount: 1,
             },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok || !res.body) {
      console.warn('Gemini image API HTTP error', res.status)
      return null
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let lastBase64: string | null = null
    let lastMime: string = 'image/png'
    let firstBase64: string | null = null
    let firstMime: string = 'image/png'
    let readerCancelled = false
    let foundFirst = false

    const cancelReader = async () => {
      if (readerCancelled) return
      readerCancelled = true
      try { await reader.cancel() } catch {}
    }

    function tryExtract(obj: any) {
      if (!obj || typeof obj !== 'object') return
      // Look for inline data in common fields
      const parts = obj?.candidates?.[0]?.content?.parts || obj?.content?.parts || obj?.parts || obj
      const arr = Array.isArray(parts) ? parts : [parts]
      for (const p of arr) {
        const dataNode = p?.inline_data || p?.inlineData
        const data = dataNode?.data
        const mime = dataNode?.mime_type || dataNode?.mimeType
        if (data && typeof data === 'string') {
          lastBase64 = data
          if (mime) lastMime = mime
          if (!firstBase64) {
            firstBase64 = data
            firstMime = mime || firstMime
            // We already have the first candidate image; cancel further streaming
            cancelReader()
            foundFirst = true
          }
        }
      }
    }

    outer: while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const lineRaw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        const line = lineRaw.trim()
        if (!line) continue
        // Support SSE style: lines like "data: {json}"
        const jsonText = line.startsWith('data:') ? line.slice(5).trim() : line
        try {
          const obj = JSON.parse(jsonText)
          tryExtract(obj)
          if (foundFirst) break outer
        } catch {
          // ignore non-JSON lines
        }
      }
    }

    // Try parse any remaining buffer
    const tail = buffer.trim()
    if (tail) {
      try { tryExtract(JSON.parse(tail)) } catch {}
    }

    const chosenBase64 = firstBase64 || lastBase64
    const chosenMime = firstBase64 ? firstMime : lastMime
    if (!chosenBase64) {
      // Fallback: try non-streaming generateContent once
      const nonStreaming = await fetchNonStreamingImage(apiKey, prompt)
      if (nonStreaming) return nonStreaming
      return null
    }
    const img = new Image()
    img.src = `data:${chosenMime};base64,${chosenBase64}`
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
    })
    return img
  } catch (e) {
    console.warn('Gemini image generation failed', e)
    return null
  }
}


async function fetchNonStreamingImage(apiKey: string, prompt: string): Promise<HTMLImageElement | null> {
  try {
    const modelId = 'gemini-2.5-flash-image-preview'
    const endpoint = 'generateContent'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${endpoint}?key=${encodeURIComponent(apiKey)}`

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        candidateCount: 1,
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = await res.json()

    function tryExtractInline(obj: any): { base64: string, mime: string } | null {
      const parts = obj?.candidates?.[0]?.content?.parts || obj?.content?.parts || obj?.parts || []
      const arr = Array.isArray(parts) ? parts : [parts]
      for (const p of arr) {
        const dataNode = p?.inline_data || p?.inlineData
        const dataStr = dataNode?.data
        const mime = dataNode?.mime_type || dataNode?.mimeType || 'image/png'
        if (dataStr && typeof dataStr === 'string') {
          return { base64: dataStr, mime }
        }
      }
      return null
    }

    const found = tryExtractInline(data)
    if (!found) return null

    const img = new Image()
    img.src = `data:${found.mime};base64,${found.base64}`
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
    })
    return img
  } catch {
    return null
  }
}


