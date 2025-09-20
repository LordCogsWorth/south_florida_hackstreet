# 🎓 Lecture Board Analyst

An Agentuity-powered agent that analyzes lecture videos with intelligent whiteboard/blackboard detection, OCR text extraction, and AI-powered Q&A capabilities.

## ✨ Features

- **📹 Video Ingestion**: Upload videos via URL or direct file upload
- **🎵 Audio Processing**: Extract audio with ffmpeg for transcript generation  
- **🖼️ Frame Analysis**: Extract frames for board change detection
- **📝 Transcription**: Convert audio to timestamped text using Whisper
- **🔍 Board Detection**: Automatically detect whiteboard/blackboard regions
- **📊 Change Detection**: Use SSIM algorithms to identify when board content changes
- **🔤 OCR Processing**: Extract text from board snapshots with Tesseract
- **🤖 AI Analysis**: Generate Q&A, summaries, and flashcards using LLM
- **🔗 Timestamped Links**: Jump to specific moments in lectures
- **📚 Vector Search**: Semantic search across transcript and board content

## 🚀 Quick Start

### Prerequisites

1. **Agentuity Account**: Sign up at [app.agentuity.com](https://app.agentuity.com)
2. **Agentuity CLI**: Install the CLI tool
   ```bash
   curl -fsS https://agentuity.sh | sh
   ```
3. **FFmpeg**: Required for video processing
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

### Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd lecture-agent
   npm install
   ```

2. **Environment Variables** (Optional)
   ```bash
   export OPENAI_API_KEY="your-openai-key"  # For better transcription and AI analysis
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```
   This starts the agent locally with hot reload at `http://localhost:3000`

4. **Deploy to Agentuity Cloud**
   ```bash
   npm run deploy
   ```
   Returns a cloud endpoint URL for production use.

## 🎯 API Usage

### 1. Upload Video
```bash
curl -X POST http://localhost:3000/io/upload \
  -F "video=@lecture.mp4"
```

### 2. Process Video
```bash
curl -X POST http://localhost:3000/io/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/lecture.mp4",
    "title": "CS101 - Algorithms"
  }'
```

Response:
```json
{
  "success": true,
  "lectureId": "uuid-here",
  "segments": 45,
  "boardEvents": 12,
  "ocrTexts": 10,
  "message": "Lecture processed successfully"
}
```

### 3. Ask Questions
```bash
curl -X POST http://localhost:3000/io/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "lectureId": "uuid-here",
    "query": "What is dynamic programming?"
  }'
```

Response:
```json
{
  "success": true,
  "answer": "Dynamic programming is an optimization technique...",
  "links": [
    {
      "t": 120,
      "timecode": "02:00",
      "text": "Now let's discuss dynamic programming...",
      "type": "asr"
    }
  ],
  "flashcards": [
    {
      "question": "What is dynamic programming?",
      "answer": "A method for solving complex problems..."
    }
  ]
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Video Input   │───▶│   FFmpeg        │───▶│   Audio + Frames │
│                 │    │   Processing     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────┐               ▼
                       │   Whisper ASR   │◀──────┌─────────────────┐
                       │   Transcription │       │   Agentuity     │
                       └─────────────────┘       │   Object Store  │
                                                 └─────────────────┘
┌─────────────────┐    ┌──────────────────┐               │
│  Board Change   │◀───│   SSIM/Hash     │◀───────────────┤
│  Detection      │    │   Comparison     │               │
└─────────────────┘    └──────────────────┘               │
         │                                                │
         ▼                                                │
┌─────────────────┐    ┌──────────────────┐               │
│   Tesseract     │───▶│   Text          │──────────────▶│
│   OCR           │    │   Extraction     │               │
└─────────────────┘    └──────────────────┘               │
                                                         │
         ┌─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vector Store  │◀───│   Indexing      │◀───│   AI Analysis   │
│   + Search      │    │   Pipeline       │    │   & QA          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Board Detection Tuning

Modify `src/util/boardDetect.ts`:

```typescript
// For whiteboards (bright backgrounds)
const threshold_bright = 200;

// For blackboards (dark backgrounds)  
const threshold_dark = 50;

// Change detection sensitivity (0.85 = 85% similarity required)
const changeThreshold = 0.85;
```

### OCR Enhancement

Update `src/tools/ocrBoard.ts`:

```typescript
await worker.setParameters({
  tessedit_pageseg_mode: '6',  // 6=uniform block, 8=single char, 13=raw line
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?'
});
```

## 🎓 Lecture Types Supported

- **Whiteboards**: Automatically detects bright rectangular regions
- **Blackboards**: Detects dark rectangular regions with white text
- **Slide Presentations**: Falls back to full-frame change detection
- **Mixed Content**: Adapts detection based on content analysis

## 📊 Performance Tips

1. **Video Quality**: Higher resolution improves OCR accuracy
2. **Frame Rate**: 1 FPS sampling balances performance vs. detection
3. **Board Positioning**: Consistent board framing improves detection
4. **Lighting**: Even lighting reduces false positive changes

## 🔌 Extensions

### Add Slack Integration
```typescript
// In agent.config.ts
outputs: [
  { type: "http" },
  { type: "slack", channel: "#lectures" }
]
```

### Custom ASR Provider
```typescript
// In src/tools/buildTranscript.ts
// Replace Whisper with your provider
const result = await yourASRProvider.transcribe(audioPath);
```

### Enhanced AI Models
```typescript
// Use Agentuity's AI Gateway for multiple providers
import { chat } from "@agentuity/sdk";

const response = await chat({
  model: "claude-3-sonnet",  // or gpt-4, etc.
  messages: [{ role: "user", content: prompt }]
});
```

## 🐛 Troubleshooting

### FFmpeg Issues
```bash
# Check FFmpeg installation
ffmpeg -version

# Install missing codecs (Ubuntu)
sudo apt install ubuntu-restricted-extras
```

### OCR Accuracy
```typescript
// Try different page segmentation modes
tessedit_pageseg_mode: '8'  // Single character for handwriting
tessedit_pageseg_mode: '6'  // Uniform block for printed text
tessedit_pageseg_mode: '13' // Raw line for simple layouts
```

### Memory Usage
- Reduce frame resolution in `detectBoardEdits.ts`
- Process videos in chunks for large files
- Increase Node.js memory: `node --max-old-space-size=4096`

## 📈 Monitoring

Agentuity provides built-in observability:
- Request tracing and performance metrics
- Error tracking and alerting
- Usage analytics and cost monitoring

Access via the Agentuity dashboard after deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with [Agentuity](https://agentuity.com) - The AI Agent Platform**