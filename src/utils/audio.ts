/*
 High-level microphone capture and downsampling utilities for 16 kHz PCM.
 This implementation uses ScriptProcessorNode for broad browser support.
*/

export type MicrophoneProcessor = {
  start: () => Promise<void>;
  stop: () => void;
};

export function createMicrophoneProcessor(
  onPcm16Chunk: (chunkBuffer: ArrayBuffer) => void,
  targetSampleRate: number = 16000
): MicrophoneProcessor {
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;

  async function start() {
    if (audioContext) return;
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    // Buffer size 4096 provides a good balance for latency and CPU
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    const inputSampleRate = audioContext.sampleRate;

    processorNode.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleToTarget(inputBuffer, inputSampleRate, targetSampleRate);
      const pcm16 = floatTo16BitPCM(downsampled);
      // Copy into a real ArrayBuffer to avoid SharedArrayBuffer typing
      const copy = new ArrayBuffer(pcm16.byteLength)
      new Uint8Array(copy).set(new Uint8Array(pcm16.buffer))
      onPcm16Chunk(copy)
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
  }

  function stop() {
    if (processorNode) {
      try { processorNode.disconnect(); } catch {}
      processorNode.onaudioprocess = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch {}
    }
    if (audioContext) {
      try { audioContext.close(); } catch {}
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    audioContext = null;
    mediaStream = null;
    sourceNode = null;
    processorNode = null;
  }

  return { start, stop };
}

export function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const output = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export function pcm16ToBase64(int16Array: Int16Array): string {
  // Convert Int16Array to base64 string expected by AssemblyAI realtime
  const buffer = new ArrayBuffer(int16Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < int16Array.length; i += 1) {
    view.setInt16(i * 2, int16Array[i], true);
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function downsampleToTarget(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (targetSampleRate === inputSampleRate) return input;
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);

  // Simple average-based downsampling for MVP quality
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }
    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return output;
}


