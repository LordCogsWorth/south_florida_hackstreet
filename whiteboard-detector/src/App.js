import { useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedText, setDetectedText] = useState('');
  const [ocrWorker, setOcrWorker] = useState(null);
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_OPENAI_API_KEY || '');
  const [isUsingChatGPT, setIsUsingChatGPT] = useState(false);
  const [chatGPTResult, setChatGPTResult] = useState('');
  
  // AI Vision Analysis Results
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  
  // Rate limiting and conversation state
  const [lastApiCall, setLastApiCall] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState('unchecked'); // unchecked, valid, invalid
  
  // Test API key validity
  const testApiKey = async () => {
    if (!apiKey) {
      setApiKeyStatus('invalid');
      return;
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        setApiKeyStatus('valid');
        console.log('✅ API key is valid');
      } else {
        setApiKeyStatus('invalid');
        console.log('❌ API key is invalid');
      }
    } catch (error) {
      setApiKeyStatus('invalid');
      console.log('❌ API key test failed:', error);
    }
  };
  
  // Backend integration state
  const [isUsingBackend, setIsUsingBackend] = useState(false);
  const [lectureId, setLectureId] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize OCR worker with handwriting optimizations
  const initializeOCR = async () => {
    if (ocrWorker) return ocrWorker;
    
    try {
      console.log('Starting OCR initialization...');
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => console.log('OCR Logger:', m)
      });
      
      // Configure for better handwriting recognition
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}=-+*/\'"@#$%^&_|\\~ ',
        tessedit_pageseg_mode: '6', // Uniform block of text
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0'
      });
      
      console.log('OCR worker created successfully');
      setOcrWorker(worker);
      return worker;
    } catch (error) {
      console.error('OCR initialization failed:', error);
      setDetectedText('OCR initialization failed: ' + error.message);
      return null;
    }
  };

  // Handle video file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoURL(url);
      setScreenshots([]);
      setDetectedText('');
      setOcrWorker(null); // Reset worker for new video
      setLectureId('');
      setProcessingStatus('');
      setQueryResult('');
      
      // If using backend, upload and process the video
      if (isUsingBackend) {
        try {
          setUploadProgress('Uploading video to backend...');
          const uploadResult = await uploadVideoToBackend(file);
          console.log('Upload result:', uploadResult);
          
          setUploadProgress('Upload complete! Processing video...');
          const processResult = await processVideoWithBackend(
            uploadResult.video.path, 
            file.name
          );
          console.log('Process result:', processResult);
          
          setLectureId(processResult.lectureId);
          setProcessingStatus(`Processing started. Lecture ID: ${processResult.lectureId}`);
          setUploadProgress('');
        } catch (error) {
          console.error('Backend upload/processing failed:', error);
          setUploadProgress(`Error: ${error.message}`);
        }
      } else {
        // Initialize OCR for local processing
        setTimeout(() => {
          initializeOCR();
        }, 1000);
      }
    } else {
      alert('Please select a valid video file');
    }
  };

  // Take a screenshot of current video frame
  const takeScreenshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create screenshot object
    canvas.toBlob((blob) => {
      const screenshot = {
        id: Date.now(),
        blob: blob,
        url: URL.createObjectURL(blob),
        timestamp: video.currentTime,
        detectedText: detectedText || 'No text detected'
      };
      setScreenshots(prev => [...prev, screenshot]);
    }, 'image/png');
  };

  // Image preprocessing for better OCR
  const preprocessImage = (canvas, ctx) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and enhance contrast
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Enhance contrast - make text darker and background lighter
      let enhanced;
      if (gray < 128) {
        // Dark pixels (likely text) - make darker
        enhanced = Math.max(0, gray - 30);
      } else {
        // Light pixels (likely background) - make lighter
        enhanced = Math.min(255, gray + 30);
      }
      
      // Apply threshold for better text separation
      const threshold = enhanced < 100 ? 0 : 255;
      
      data[i] = threshold;     // Red
      data[i + 1] = threshold; // Green
      data[i + 2] = threshold; // Blue
      // Alpha channel (data[i + 3]) remains unchanged
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  // OCR text detection with preprocessing
  const detectText = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setDetectedText('Video or canvas not available');
      return;
    }

    setIsDetecting(true);
    setDetectedText('Initializing OCR...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size and draw current frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setDetectedText('Video not loaded properly');
        setIsDetecting(false);
        return;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setDetectedText('Preprocessing image for handwriting...');

      // Apply image preprocessing for better OCR
      preprocessImage(canvas, ctx);

      // Get or initialize OCR worker
      let worker = ocrWorker;
      if (!worker) {
        worker = await initializeOCR();
      }

      if (worker) {
        setDetectedText('Running enhanced OCR...');
        
        // Convert processed canvas to data URL and run OCR
        const dataURL = canvas.toDataURL('image/png');
        
        const { data: { text, confidence } } = await worker.recognize(dataURL, {
          rectangle: { top: 0, left: 0, width: canvas.width, height: canvas.height }
        });
        
        const cleanText = text.trim() || 'No text detected';
        const confidenceText = confidence ? ` (Confidence: ${confidence.toFixed(1)}%)` : '';
        setDetectedText(cleanText + confidenceText);
        console.log('OCR Result:', cleanText, 'Confidence:', confidence);
      } else {
        setDetectedText('OCR worker initialization failed');
      }

    } catch (error) {
      console.error('Text detection failed:', error);
      setDetectedText('Detection failed: ' + error.message);
    } finally {
      setIsDetecting(false);
    }
  };

  // Enhanced OCR for messy handwriting
  const detectTextEnhanced = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setDetectedText('Video or canvas not available');
      return;
    }

    setIsDetecting(true);
    setDetectedText('Initializing enhanced handwriting detection...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size and draw current frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setDetectedText('Video not loaded properly');
        setIsDetecting(false);
        return;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get or initialize OCR worker
      let worker = ocrWorker;
      if (!worker) {
        worker = await initializeOCR();
      }

      if (worker) {
        // Try multiple preprocessing approaches
        const results = [];
        
        // Method 1: High contrast black/white
        setDetectedText('Method 1: High contrast processing...');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        preprocessImage(canvas, ctx);
        const dataURL1 = canvas.toDataURL('image/png');
        
        await worker.setParameters({
          tessedit_pageseg_mode: '6', // Uniform block of text
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}=-+*/\'"@#$%^&_|\\~ \n'
        });
        
        const result1 = await worker.recognize(dataURL1);
        results.push({ method: 'High Contrast', text: result1.data.text, confidence: result1.data.confidence });

        // Method 2: Single character mode for individual letters
        setDetectedText('Method 2: Character-by-character analysis...');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        await worker.setParameters({
          tessedit_pageseg_mode: '8', // Single character
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        });
        
        const dataURL2 = canvas.toDataURL('image/png');
        const result2 = await worker.recognize(dataURL2);
        results.push({ method: 'Character Mode', text: result2.data.text, confidence: result2.data.confidence });

        // Method 3: Raw text detection with minimal processing
        setDetectedText('Method 3: Raw text detection...');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        await worker.setParameters({
          tessedit_pageseg_mode: '13', // Raw line. Treat the image as a single text line
          preserve_interword_spaces: '1'
        });
        
        const dataURL3 = canvas.toDataURL('image/png');
        const result3 = await worker.recognize(dataURL3);
        results.push({ method: 'Raw Line', text: result3.data.text, confidence: result3.data.confidence });

        // Find best result
        const bestResult = results.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );

        // Display all results
        let displayText = `🏆 BEST (${bestResult.method}): ${bestResult.text}\n\n`;
        results.forEach(result => {
          displayText += `${result.method} (${result.confidence?.toFixed(1)}%): ${result.text}\n\n`;
        });

        setDetectedText(displayText);
        console.log('Enhanced OCR Results:', results);
      } else {
        setDetectedText('OCR worker initialization failed');
      }

    } catch (error) {
      console.error('Enhanced text detection failed:', error);
      setDetectedText('Enhanced detection failed: ' + error.message);
    } finally {
      setIsDetecting(false);
    }
  };

  // ChatGPT integration for better text interpretation
  const enhanceWithChatGPT = async (imageDataURL, ocrText) => {
    if (!apiKey) {
      setChatGPTResult('Please enter your OpenAI API key first');
      return;
    }

    setIsUsingChatGPT(true);
    setChatGPTResult('Sending to ChatGPT for analysis...');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `I have handwritten text on a whiteboard that OCR is struggling to read accurately. The OCR detected this text: "${ocrText}". Please look at the image and provide a clean, corrected version of what is actually written. Focus on:
1. Correcting OCR errors and misread characters
2. Fixing spacing and formatting
3. Interpreting unclear handwriting
4. Organizing the text logically
5. Only return the corrected text content, nothing else.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageDataURL
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        
        if (response.status === 429) {
          errorMessage = `⚠️ Rate Limit Exceeded (429)\n\nYou've made too many requests to the OpenAI API. This usually means:\n• You've exceeded your API rate limit\n• Your API key has insufficient credits\n• Too many requests in a short time\n\nPlease wait a few minutes and try again, or check your OpenAI account for usage limits.`;
        } else if (response.status === 401) {
          errorMessage = `🔑 Authentication Error (401)\n\nYour API key appears to be invalid or expired. Please check:\n• The API key is correct\n• The key has proper permissions\n• Your OpenAI account is in good standing`;
        } else if (response.status === 400) {
          errorMessage = `⚠️ Bad Request (400)\n\nThere was an issue with the request format. This might be due to:\n• Image format not supported\n• Request too large\n• Invalid parameters`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const correctedText = data.choices[0]?.message?.content || 'No response from ChatGPT';
      setChatGPTResult(correctedText);
      
      // Update the main detected text with ChatGPT result
      setDetectedText(`🤖 ChatGPT Enhanced:\n${correctedText}\n\n📝 Original OCR:\n${ocrText}`);
      
    } catch (error) {
      console.error('ChatGPT API error:', error);
      setChatGPTResult(`Error: ${error.message}`);
    } finally {
      setIsUsingChatGPT(false);
    }
  };

  // AI Vision Analysis using Agentuity Agent
  const analyzeSceneWithAI = async (imageDataURL) => {
    const agentuityApiKey = process.env.REACT_APP_AGENTUITY_API_KEY;
    const webhookUrl = process.env.REACT_APP_AGENTUITY_WEBHOOK_URL;
    
    if (!agentuityApiKey || !webhookUrl) {
      setChatGPTResult('Agentuity configuration missing. Please check environment variables.');
      setAiAnalysisResult('Agentuity configuration missing. Please check environment variables.');
      setShowAnalysisPanel(true);
      return;
    }

    // Rate limiting check with more conservative timing
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    const minDelay = 5000; // 5 seconds between calls for Agentuity
    
    if (timeSinceLastCall < minDelay) {
      const waitTime = Math.ceil((minDelay - timeSinceLastCall) / 1000);
      const waitMessage = `⏱️ Rate Limiting Protection\n\nPlease wait ${waitTime} seconds before making another request.\n\nThis prevents overloading your Agentuity agent.`;
      setAiAnalysisResult(waitMessage);
      setShowAnalysisPanel(true);
      return;
    }

    setLastApiCall(now);
    setIsUsingChatGPT(true);
    setChatGPTResult('🤖 Analyzing scene with your Agentuity AI Agent...');
    setAiAnalysisResult('🤖 Analyzing scene with your Agentuity AI Agent...');
    setShowAnalysisPanel(true);

    try {
      // Convert base64 image to blob for multipart upload
      const response = await fetch(imageDataURL);
      const blob = await response.blob();
      
      // Create FormData for the webhook
      const formData = new FormData();
      formData.append('image', blob, 'analysis.jpg');
      formData.append('message', `Please provide a comprehensive analysis of this image. I want to understand everything that's happening in this scene. Please include:

📋 **SCENE OVERVIEW:**
- What type of environment is this? (classroom, office, meeting room, etc.)
- What is the main focus or subject?

🔍 **DETAILED OBSERVATIONS:**
- All text visible (handwritten, printed, on boards, signs, etc.)
- People present (count, what they're doing, clothing, gestures)
- Objects and equipment (whiteboards, computers, furniture, tools)
- Colors, lighting, and atmosphere

📝 **TEXT CONTENT:**
- Transcribe ALL visible text accurately
- Note the context of each text element
- Identify any diagrams, equations, or drawings

🎯 **EDUCATIONAL CONTENT:**
- If this appears to be educational, what subject/topic?
- Key concepts being taught or discussed
- Any visual aids or teaching materials

📊 **SUMMARY:**
- Main purpose/activity in this scene
- Most important information conveyed
- Overall assessment of what's happening

Be thorough and detailed - I want to understand everything about this scene!`);

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agentuityApiKey}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formData
      });

      if (!webhookResponse.ok) {
        let errorMessage = `Agentuity Agent Error: ${webhookResponse.status} ${webhookResponse.statusText}`;
        
        if (webhookResponse.status === 429) {
          errorMessage = `⚠️ Rate Limit Exceeded\n\nYour Agentuity agent is temporarily overloaded. Please wait a moment and try again.`;
        } else if (webhookResponse.status === 401) {
          errorMessage = `🔑 Authentication Error\n\nYour Agentuity API key appears to be invalid. Please check your configuration.`;
        } else if (webhookResponse.status === 400) {
          errorMessage = `⚠️ Bad Request\n\nThere was an issue with the request. Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await webhookResponse.json();
      const analysis = data.response || data.message || data.content || 'Analysis complete - check with your agent for results';
      
      setChatGPTResult(analysis);
      setAiAnalysisResult(analysis);
      setShowAnalysisPanel(true);
      
      // Update the main detected text
      setDetectedText(`🤖 Agentuity AI Analysis Complete! Check the analysis panel for detailed results.`);
      
    } catch (error) {
      console.error('Agentuity Agent error:', error);
      const errorMsg = `Error: ${error.message}`;
      setChatGPTResult(errorMsg);
      setAiAnalysisResult(errorMsg);
      setShowAnalysisPanel(true);
    } finally {
      setIsUsingChatGPT(false);
    }
  };

  // AI Agent for Q&A about analyzed content
  // AI Agent Q&A using Agentuity Agent
  const askQuestionAboutContent = async () => {
    const agentuityApiKey = process.env.REACT_APP_AGENTUITY_API_KEY;
    const webhookUrl = process.env.REACT_APP_AGENTUITY_WEBHOOK_URL;
    
    if (!agentuityApiKey || !webhookUrl) {
      alert('Agentuity configuration missing. Please check environment variables.');
      return;
    }
    
    if (!userQuestion.trim()) {
      alert('Please enter a question');
      return;
    }
    
    if (!aiAnalysisResult) {
      alert('Please analyze some content first before asking questions');
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    const minDelay = 3000; // 3 seconds for Q&A with Agentuity
    
    if (timeSinceLastCall < minDelay) {
      const waitTime = Math.ceil((minDelay - timeSinceLastCall) / 1000);
      alert(`Please wait ${waitTime} seconds before asking another question.`);
      return;
    }

    setLastApiCall(now);
    setIsUsingChatGPT(true);

    try {
      // Create the context-aware message for Agentuity
      const contextualQuestion = `Based on my previous image analysis, please answer this question:

PREVIOUS ANALYSIS CONTEXT:
${aiAnalysisResult}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT QUESTION: ${userQuestion}

Please provide a helpful answer based on the analysis and conversation context above.`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agentuityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: contextualQuestion,
          type: 'question'
        })
      });

      if (!response.ok) {
        let errorMessage = `Agentuity Agent Error: ${response.status} ${response.statusText}`;
        
        if (response.status === 429) {
          errorMessage = `⚠️ Rate Limit Exceeded\n\nToo many questions too quickly. Please wait a moment before asking another question.`;
        } else if (response.status === 401) {
          errorMessage = `🔑 Authentication Error\n\nYour Agentuity API key appears to be invalid.`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const answer = data.response || data.message || data.content || 'Response received from agent';
      
      // Add to conversation history
      const newConversation = [
        ...conversationHistory,
        { role: "user", content: userQuestion },
        { role: "assistant", content: answer }
      ];
      
      // Keep only last 6 messages (3 Q&A pairs) to manage context length
      const trimmedHistory = newConversation.slice(-6);
      setConversationHistory(trimmedHistory);
      
      // Clear the input
      setUserQuestion('');
      
    } catch (error) {
      console.error('Agentuity Agent error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsUsingChatGPT(false);
    }
  };

  // Full Scene Analysis - capture frame and analyze everything with AI Vision
  const analyzeCurrentScene = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setDetectedText('Video or canvas not available');
      return;
    }

    setIsDetecting(true);
    setDetectedText('📸 Capturing frame for AI analysis...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size and draw current frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setDetectedText('Video not loaded properly');
        setIsDetecting(false);
        return;
      }

      // Draw current video frame without any preprocessing for AI Vision
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL for AI Vision API
      const dataURL = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG for smaller size
      
      // Run AI Vision analysis
      await analyzeSceneWithAI(dataURL);
      
    } catch (error) {
      console.error('Scene analysis failed:', error);
      setDetectedText('Scene analysis failed: ' + error.message);
    } finally {
      setIsDetecting(false);
    }
  };

  // Enhanced OCR with ChatGPT integration
  const detectTextWithChatGPT = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setDetectedText('Video or canvas not available');
      return;
    }

    setIsDetecting(true);
    setDetectedText('Running OCR + ChatGPT analysis...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size and draw current frame
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setDetectedText('Video not loaded properly');
        setIsDetecting(false);
        return;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setDetectedText('Preprocessing image...');

      // Apply image preprocessing for better OCR
      preprocessImage(canvas, ctx);

      // Get or initialize OCR worker
      let worker = ocrWorker;
      if (!worker) {
        worker = await initializeOCR();
      }

      if (worker) {
        setDetectedText('Running OCR...');
        
        // Convert processed canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        const { data: { text, confidence } } = await worker.recognize(dataURL);
        const ocrText = text.trim() || 'No text detected';
        
        setDetectedText(`OCR Result: ${ocrText}\n\nSending to ChatGPT for enhancement...`);
        
        // Send to ChatGPT for enhancement
        await enhanceWithChatGPT(dataURL, ocrText);
        
      } else {
        setDetectedText('OCR worker initialization failed');
      }

    } catch (error) {
      console.error('OCR + ChatGPT detection failed:', error);
      setDetectedText('Detection failed: ' + error.message);
    } finally {
      setIsDetecting(false);
    }
  };

  // Auto-detect text and take screenshot
  const detectAndCapture = async () => {
    await detectText();
    setTimeout(() => {
      takeScreenshot();
    }, 500); // Small delay to ensure text is updated
  };

  // Clear all screenshots
  const clearScreenshots = () => {
    screenshots.forEach(screenshot => {
      if (screenshot.url) {
        URL.revokeObjectURL(screenshot.url);
      }
    });
    setScreenshots([]);
  };

  // Backend API Integration Functions
  const API_BASE_URL = 'http://localhost:3000';

  // Upload video to backend
  const uploadVideoToBackend = async (videoFile) => {
    const formData = new FormData();
    formData.append('video', videoFile);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Backend upload error:', error);
      throw error;
    }
  };

  // Process video with backend
  const processVideoWithBackend = async (videoPath, title = 'Untitled Lecture') => {
    try {
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoPath,
          title
        })
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Backend processing error:', error);
      throw error;
    }
  };

  // Query processed lecture
  const queryLecture = async (lectureId, query) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lectureId,
          query
        })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Backend query error:', error);
      throw error;
    }
  };

  // Handle querying the backend
  const handleBackendQuery = async () => {
    if (!lectureId || !queryText.trim()) {
      setQueryResult('Please ensure video is processed and enter a query');
      return;
    }

    setIsQuerying(true);
    setQueryResult('Analyzing lecture content...');

    try {
      const result = await queryLecture(lectureId, queryText.trim());
      console.log('Query result:', result);
      
      let formattedResult = `Answer: ${result.answer}\n\n`;
      
      if (result.links && result.links.length > 0) {
        formattedResult += 'Relevant timestamps:\n';
        result.links.forEach(link => {
          formattedResult += `• ${link.timecode}: ${link.text}\n`;
        });
        formattedResult += '\n';
      }
      
      if (result.flashcards && result.flashcards.length > 0) {
        formattedResult += 'Generated flashcard:\n';
        result.flashcards.forEach(card => {
          formattedResult += `Q: ${card.question}\nA: ${card.answer}\n`;
        });
      }
      
      setQueryResult(formattedResult);
    } catch (error) {
      console.error('Query failed:', error);
      setQueryResult(`Query failed: ${error.message}`);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>� AI Scene Analyzer</h1>
        <p>Upload videos and analyze everything with AI Vision + OCR text detection</p>
      </header>

      <main className="App-main">
        {/* File Upload */}
        <div className="upload-section">
          <label htmlFor="video-upload" className="upload-label">
            Choose Video File
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="file-input"
          />
          {!videoFile && (
            <div className="upload-prompt">
              <p>📹 Select a video file to get started</p>
              <p><small>Supported formats: MP4, WebM, AVI</small></p>
            </div>
          )}
        </div>

        {/* Video Player */}
        {videoURL && (
          <div className="video-section">
            {/* API Key Input */}
            <div className="api-config">
              <h3>🤖 AI-Powered Analysis</h3>
              <div className="api-input-group">
                <input
                  type="password"
                  placeholder="Enter your OpenAI API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="api-input"
                />
                <small className="api-help">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
                  <br />
                  <strong>Features:</strong> OCR Enhancement + Full Scene Analysis with AI Vision
                </small>
              </div>
            </div>

            {/* Backend Integration Toggle */}
            <div className="backend-config">
              <h3>🚀 Backend Analysis</h3>
              <div className="backend-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={isUsingBackend}
                    onChange={(e) => setIsUsingBackend(e.target.checked)}
                  />
                  Use backend API for full lecture analysis
                </label>
                <small className="backend-help">
                  Enable this to upload videos to the backend for comprehensive analysis including board change detection and Q&A capabilities
                </small>
              </div>
              
              {/* Upload/Processing Status */}
              {uploadProgress && (
                <div className="status-message upload-status">
                  {uploadProgress}
                </div>
              )}
              
              {processingStatus && (
                <div className="status-message processing-status">
                  {processingStatus}
                </div>
              )}
              
              {/* Query Interface */}
              {lectureId && (
                <div className="query-section">
                  <h4>🔍 Ask Questions About This Lecture</h4>
                  <div className="query-input-group">
                    <input
                      type="text"
                      placeholder="Ask a question about the lecture content..."
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      className="query-input"
                      onKeyPress={(e) => e.key === 'Enter' && handleBackendQuery()}
                    />
                    <button
                      onClick={handleBackendQuery}
                      disabled={isQuerying || !queryText.trim()}
                      className="query-button"
                    >
                      {isQuerying ? 'Analyzing...' : 'Ask Question'}
                    </button>
                  </div>
                  
                  {queryResult && (
                    <div className="query-result">
                      <h5>📋 Analysis Result:</h5>
                      <pre className="result-text">{queryResult}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="video-container">
              <video
                ref={videoRef}
                src={videoURL}
                controls
                className="video-player"
              >
                Your browser does not support the video tag.
              </video>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Controls */}
            <div className="controls">
              <button onClick={takeScreenshot} className="btn primary">
                📸 Screenshot
              </button>
              <button 
                onClick={analyzeCurrentScene} 
                disabled={isDetecting || !apiKey}
                className="btn ai-vision primary-action"
              >
                {isDetecting ? '� Analyzing with AI...' : '� Analyze Full Scene with AI'}
              </button>
              <button 
                onClick={initializeOCR} 
                disabled={isDetecting}
                className="btn info"
              >
                🔧 Initialize OCR
              </button>
              <button 
                onClick={detectAndCapture} 
                disabled={isDetecting}
                className="btn highlight"
              >
                {isDetecting ? '⚡ Processing...' : '⚡ Detect & Capture'}
              </button>
              {screenshots.length > 0 && (
                <button onClick={clearScreenshots} className="btn danger">
                  🗑️ Clear All ({screenshots.length})
                </button>
              )}
              <button 
                onClick={() => {
                  alert(`API Status:\n- API Key: ${apiKey ? 'Present' : 'Missing'}\n- Connection: Testing...\n\nCheck console for details.`);
                  console.log('API Key Check:', { 
                    hasKey: !!apiKey, 
                    keyLength: apiKey?.length,
                    keyStart: apiKey?.substring(0, 15) + '...',
                    timestamp: new Date().toISOString()
                  });
                }}
                className="btn info"
                title="Test API connection and debug"
              >
                🔧 Test API
              </button>
            </div>

            {/* Detected Text Display */}
            <div className="text-detection">
              <h3>🔍 Detected Text:</h3>
              <div className="detected-text-box">
                {detectedText || 'Click "Detect Text" to analyze the current frame'}
              </div>
            </div>
          </div>
        )}

        {/* Screenshots Gallery */}
        {/* AI Vision Analysis Panel */}
        {showAnalysisPanel && aiAnalysisResult && (
          <div className="ai-analysis-panel">
            <div className="panel-header">
              <h3>🛸 AI Vision Analysis Results</h3>
              <button 
                onClick={() => setShowAnalysisPanel(false)}
                className="close-panel-btn"
              >
                ✕
              </button>
            </div>
            <div className="analysis-content">
              <div className="analysis-section">
                <h4>📊 Scene Analysis</h4>
                <pre className="analysis-text">{aiAnalysisResult}</pre>
              </div>
              
              {/* AI Agent Q&A Interface */}
              <div className="qa-section">
                <h4>🤖 Ask Questions About This Content</h4>
                <div className="qa-input-group">
                  <input
                    type="text"
                    placeholder="Ask a question about what you see in the image..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    className="qa-input"
                    onKeyPress={(e) => e.key === 'Enter' && askQuestionAboutContent()}
                    disabled={isUsingChatGPT}
                  />
                  <button
                    onClick={askQuestionAboutContent}
                    disabled={isUsingChatGPT || !userQuestion.trim()}
                    className="qa-button"
                  >
                    {isUsingChatGPT ? '🤔 Thinking...' : '💬 Ask'}
                  </button>
                </div>
                
                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="conversation-history">
                    <h5>💭 Conversation</h5>
                    <div className="conversation-messages">
                      {conversationHistory.map((message, index) => (
                        <div 
                          key={index} 
                          className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
                        >
                          <div className="message-role">
                            {message.role === 'user' ? '👤 You:' : '🤖 AI:'}
                          </div>
                          <div className="message-content">{message.content}</div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setConversationHistory([])}
                      className="clear-conversation-btn"
                    >
                      🗑️ Clear Conversation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Screenshots Gallery */}
        {screenshots.length > 0 && (
          <div className="gallery-section">
            <h3>📱 Screenshots ({screenshots.length})</h3>
            <div className="gallery">
              {screenshots.map((screenshot) => (
                <div key={screenshot.id} className="screenshot-item">
                  <img 
                    src={screenshot.url} 
                    alt={`Screenshot at ${screenshot.timestamp.toFixed(1)}s`}
                    className="screenshot-image"
                  />
                  <div className="screenshot-info">
                    <p><strong>⏱️ Time:</strong> {screenshot.timestamp.toFixed(1)}s</p>
                    <p><strong>📝 Text:</strong> {screenshot.detectedText}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;