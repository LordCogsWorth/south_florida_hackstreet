const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import our tools (we'll need to convert these from TypeScript)
// const { ingestVideo } = require('./tools/ingestVideo');
// const { analyzeQuery } = require('./tools/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    // Ensure uploads directory exists
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(cb);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Lecture Board Analyst API',
    version: '1.0.0',
    endpoints: [
      'POST /upload - Upload a video file',
      'POST /ingest - Process a video (by URL or uploaded file)',
      'POST /analyze - Query the processed lecture content'
    ]
  });
});

// Upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoInfo = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      video: videoInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload video',
      details: error.message 
    });
  }
});

// Ingest endpoint - process video
app.post('/ingest', async (req, res) => {
  try {
    const { videoUrl, videoPath, title } = req.body;

    if (!videoUrl && !videoPath) {
      return res.status(400).json({ 
        error: 'Either videoUrl or videoPath must be provided' 
      });
    }

    // For now, return a mock response
    // TODO: Implement actual video processing
    const lectureId = uuidv4();
    
    res.json({
      success: true,
      lectureId,
      title: title || 'Untitled Lecture',
      message: 'Video processing started',
      status: 'processing',
      // Mock data
      segments: 0,
      boardEvents: 0,
      ocrTexts: 0
    });

    // In the background, we would:
    // 1. Extract audio and frames from video
    // 2. Generate transcript with timestamps
    // 3. Detect board changes
    // 4. Run OCR on board regions
    // 5. Index content for search

  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
});

// Analyze endpoint - query processed content
app.post('/analyze', async (req, res) => {
  try {
    const { lectureId, query } = req.body;

    if (!lectureId || !query) {
      return res.status(400).json({ 
        error: 'lectureId and query are required' 
      });
    }

    // For now, return a mock response
    // TODO: Implement actual analysis
    res.json({
      success: true,
      answer: `This is a mock response for query: "${query}". In a full implementation, this would search through the lecture content and provide relevant answers.`,
      links: [
        {
          t: 120,
          timecode: "02:00",
          text: "Sample transcript segment...",
          type: "asr"
        }
      ],
      flashcards: [
        {
          question: "Sample question based on your query",
          answer: "Sample answer extracted from lecture content"
        }
      ]
    });

  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze query',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lecture Board Analyst API running on port ${PORT}`);
  console.log(`📖 API documentation available at http://localhost:${PORT}`);
  console.log(`🎥 Ready to process lecture videos!`);
});

module.exports = app;