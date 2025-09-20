import { GoogleGenerativeAI } from '@google/generative-ai';
import { useRef, useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [edithResponse, setEdithResponse] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [boardScreenshot, setBoardScreenshot] = useState(null);
  
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Gemini AI
  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyAx5fKagWqc9APEHtFHkguhJHhhDqZ_3Bk');

  // Test API key function
  const testApiKey = async () => {
    setIsAnalyzing(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Test: Please respond with 'API key is working correctly! ✅'");
      const response = await result.response;
      const responseText = response.text();
      console.log('API Key Test Result:', responseText);
      setAnalysisResult(`🔑 API Key Test Result:\n\n${responseText}\n\n✅ Your Google Gemini API key is working correctly! You can now analyze videos and ask questions.`);
    } catch (error) {
      console.error('API Key Test Failed:', error);
      setAnalysisResult(`❌ API Key Test Failed:\n\n${error.message}\n\n🔧 Please check:\n• API key is correct: AIzaSyAx5fKagWqc9APEHtFHkguhJHhhDqZ_3Bk\n• Internet connection is working\n• Google Gemini API is enabled for your project`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    } else {
      alert('Please select a video file');
    }
  };

  const analyzeVideo = async () => {
    if (!selectedFile) {
      alert('Please select a video file first');
      return;
    }
    setIsAnalyzing(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Test with a simple text prompt first to verify API key
      const testResult = await model.generateContent("Hello, can you respond with 'API is working'?");
      console.log('API Test:', testResult.response.text());
      
      // If we get here, the API key works, now try with video
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          
          const prompt = `Analyze this educational video and provide a comprehensive summary focusing on:

1. 📚 MAIN TOPICS: What subjects or concepts are being taught?
2. 📝 WHITEBOARD CONTENT: Describe any equations, diagrams, text, or drawings visible on whiteboards/screens
3. 🎯 KEY LEARNING POINTS: What are the main educational objectives?
4. 🔍 VISUAL ELEMENTS: Describe charts, graphs, mathematical formulas, or visual aids shown
5. 📖 EDUCATIONAL VALUE: How would this help students learn?

Please provide a detailed, well-structured analysis that would help someone understand what was covered in this educational content.`;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: selectedFile.type
              }
            }
          ]);
          
          const response = await result.response;
          setAnalysisResult(response.text());
        } catch (error) {
          console.error('Analysis error:', error);
          let errorMessage = `❌ Analysis Error: ${error.message}`;
          
          if (error.message.includes('400')) {
            errorMessage += `\n\n🔧 Possible issues:\n• Invalid API key\n• Unsupported video format\n• File too large\n• Network connectivity issue`;
          }
          
          errorMessage += `\n\nℹ️ Debug info:\n• API Key: ${genAI.apiKey ? 'Set' : 'Missing'}\n• File type: ${selectedFile.type}\n• File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`;
          
          setAnalysisResult(errorMessage);
        }
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error:', error);
      setAnalysisResult(`❌ Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const askEdith = async () => {
    if (!question.trim()) {
      alert('Please enter a question');
      return;
    }
    setIsAsking(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const context = analysisResult ? 
        `Based on this educational content analysis: ${analysisResult}\n\n` : 
        'Based on the educational video content, ';

      const prompt = `${context}Please answer this question in a helpful, educational manner: "${question}"

Provide a clear, detailed response that:
- Directly answers the question
- Relates to the educational content if applicable
- Includes examples or explanations when helpful
- Uses a friendly, teaching tone`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setEdithResponse(response.text());
    } catch (error) {
      console.error('Error asking EDITH:', error);
      setEdithResponse(`❌ Error: ${error.message}\n\nPlease check your internet connection and API key.`);
    } finally {
      setIsAsking(false);
    }
  };

  // Capture current video frame for board analysis
  const captureBoard = () => {
    if (!videoRef.current) {
      alert('Please load a video first');
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const screenshot = canvas.toDataURL('image/png');
    setBoardScreenshot(screenshot);
    
    // Automatically analyze the captured board
    analyzeBoardContent(screenshot);
  };

  // Analyze board content using AI
  const analyzeBoardContent = async (imageData) => {
    if (!imageData) return;
    
    setIsAnalyzing(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const base64Data = imageData.split(',')[1];
      const prompt = `Analyze this whiteboard/screen capture and provide a detailed summary of:

📝 TEXT CONTENT: Any text, equations, formulas, or written content
📊 VISUAL ELEMENTS: Diagrams, charts, graphs, drawings, or illustrations  
🔢 MATHEMATICAL CONTENT: Equations, calculations, mathematical expressions
📚 EDUCATIONAL TOPICS: What subjects or concepts are being taught
🎯 KEY POINTS: Main ideas or learning objectives visible

Please provide a comprehensive analysis of what's shown on this board/screen.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        }
      ]);
      
      const response = await result.response;
      setAnalysisResult(response.text());
    } catch (error) {
      console.error('Board analysis error:', error);
      setAnalysisResult(`❌ Board Analysis Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enableDrawing = () => {
    setIsDrawing(!isDrawing);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d30 100%)',
      color: 'white',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <header style={{
        textAlign: 'center',
        padding: '30px 20px',
        background: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ 
          fontSize: '42px', 
          margin: '0 0 15px 0',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
          fontWeight: '700'
        }}>
          🎓 Smart Lecture Board Analyzer
        </h1>
        <p style={{ 
          fontSize: '20px', 
          margin: '0',
          opacity: '0.9',
          fontWeight: '300'
        }}>
          AI-powered whiteboard content analysis and interactive Q&A
        </p>
      </header>

      <main style={{
        padding: '30px 20px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Upload Section with Enhanced Design */}
        <div style={{
          textAlign: 'center',
          marginBottom: '50px',
          background: 'rgba(40, 40, 40, 0.8)',
          padding: '40px',
          borderRadius: '25px',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(80, 80, 80, 0.3)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            marginBottom: '25px',
            color: '#fff',
            fontWeight: '600'
          }}>
            📁 Upload Your Educational Video
          </h2>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'linear-gradient(45deg, #333, #555)',
              color: 'white',
              border: 'none',
              padding: '25px 50px',
              fontSize: '24px',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 15px 35px rgba(80, 80, 80, 0.4)',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-5px)';
              e.target.style.boxShadow = '0 20px 40px rgba(255, 107, 107, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 15px 35px rgba(255, 107, 107, 0.4)';
            }}
          >
            🎬 Choose Video File
          </button>
          {selectedFile && (
            <div style={{
              marginTop: '25px',
              fontSize: '18px',
              background: 'rgba(76, 175, 80, 0.2)',
              padding: '15px 25px',
              borderRadius: '25px',
              display: 'inline-block',
              border: '2px solid rgba(76, 175, 80, 0.3)'
            }}>
              ✅ <strong>Ready:</strong> {selectedFile.name}
            </div>
          )}
        </div>

        {/* Video Section with Enhanced Controls */}
        {selectedFile && (
          <div style={{
            margin: '50px 0',
            background: 'rgba(40, 40, 40, 0.8)',
            padding: '40px',
            borderRadius: '25px',
            textAlign: 'center',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(80, 80, 80, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ 
              fontSize: '28px', 
              marginBottom: '25px',
              color: '#fff',
              fontWeight: '600'
            }}>
              🎥 Video Player & Analysis Tools
            </h2>
            <video
              ref={videoRef}
              controls
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '20px',
                marginBottom: '35px',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.1)'
              }}
            />
            
            {/* Enhanced Control Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              <button
                onClick={analyzeVideo}
                disabled={isAnalyzing}
                style={{
                  padding: '20px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  background: isAnalyzing 
                    ? 'linear-gradient(45deg, #555, #777)' 
                    : 'linear-gradient(45deg, #444, #666)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {isAnalyzing ? '🔄 Analyzing...' : '🤖 Analyze Entire Video'}
              </button>

              <button
                onClick={testApiKey}
                style={{
                  padding: '20px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  background: 'linear-gradient(45deg, #28a745, #20c997)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                🔑 Test API Key
              </button>

              <button
                onClick={captureBoard}
                style={{
                  padding: '20px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  background: 'linear-gradient(45deg, #444, #666)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                📸 Capture Current Board
              </button>

              <button
                onClick={enableDrawing}
                style={{
                  padding: '20px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  background: isDrawing
                    ? 'linear-gradient(45deg, #666, #888)'
                    : 'linear-gradient(45deg, #444, #666)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {isDrawing ? '✏️ Drawing Mode ON' : '✏️ Enable Drawing'}
              </button>

              <button
                onClick={clearCanvas}
                style={{
                  padding: '20px 30px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  background: 'linear-gradient(45deg, #666, #888)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                🗑️ Clear All Drawing
              </button>
            </div>

            {/* Board Screenshot Preview */}
            {boardScreenshot && (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '15px',
                border: '2px solid rgba(76, 175, 80, 0.3)'
              }}>
                <h3 style={{ color: '#4ecdc4', marginBottom: '15px' }}>📸 Captured Board Content:</h3>
                <img 
                  src={boardScreenshot} 
                  alt="Board capture" 
                  style={{
                    maxWidth: '300px',
                    height: 'auto',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Enhanced Analysis Results Section */}
        {analysisResult && (
          <div style={{
            background: 'rgba(40, 40, 40, 0.9)',
            margin: '50px 0',
            padding: '50px',
            borderRadius: '30px',
            border: '2px solid rgba(80, 80, 80, 0.3)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)'
          }}>
            <h2 style={{
              fontSize: '36px',
              marginBottom: '35px',
              textAlign: 'center',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              background: 'linear-gradient(45deg, #ccc, #fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '700'
            }}>
              🧠 AI Analysis Results
            </h2>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '40px',
              borderRadius: '20px',
              minHeight: '250px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'rgba(76, 175, 80, 0.2)',
                padding: '8px 15px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#4CAF50',
                fontWeight: '600',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                ✨ AI POWERED
              </div>
              <pre style={{
                fontSize: '18px',
                lineHeight: '1.8',
                color: '#fff',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                margin: 0,
                paddingTop: '20px'
              }}>
                {analysisResult}
              </pre>
            </div>
          </div>
        )}

        {/* Enhanced EDITH Questions Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          padding: '50px',
          borderRadius: '30px',
          margin: '50px 0',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
        }}>
          <h2 style={{
            fontSize: '32px',
            marginBottom: '35px',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            fontWeight: '700'
          }}>
            💬 Ask EDITH - Your AI Teaching Assistant
          </h2>
          
          <p style={{
            textAlign: 'center',
            fontSize: '18px',
            marginBottom: '30px',
            opacity: '0.9',
            fontStyle: 'italic'
          }}>
            Get detailed explanations about the board content, ask for clarifications, or explore related concepts!
          </p>

          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '35px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., 'Explain the main equation shown' or 'What is the key concept here?'"
              style={{
                flex: 1,
                minWidth: '400px',
                padding: '25px 30px',
                fontSize: '18px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '25px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(78, 205, 196, 0.8)';
                e.target.style.boxShadow = '0 0 20px rgba(78, 205, 196, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
              onKeyPress={(e) => e.key === 'Enter' && askEdith()}
            />
            <button
              onClick={askEdith}
              disabled={isAsking}
              style={{
                padding: '25px 45px',
                fontSize: '18px',
                border: 'none',
                borderRadius: '25px',
                cursor: 'pointer',
                background: isAsking 
                  ? 'linear-gradient(45deg, #95a5a6, #7f8c8d)'
                  : 'linear-gradient(45deg, #a8edea, #fed6e3)',
                color: '#333',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease'
              }}
            >
              {isAsking ? '🤔 Thinking...' : '🚀 Ask EDITH'}
            </button>
          </div>

          {/* Sample Questions */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '30px'
          }}>
            {[
              'Explain the main concept',
              'What does this equation mean?',
              'How is this used in practice?',
              'Can you break this down step by step?'
            ].map((sampleQ, index) => (
              <button
                key={index}
                onClick={() => setQuestion(sampleQ)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                💡 {sampleQ}
              </button>
            ))}
          </div>

          {edithResponse && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '40px',
              borderRadius: '25px',
              borderLeft: '8px solid #4ecdc4',
              minHeight: '150px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'rgba(78, 205, 196, 0.2)',
                padding: '8px 15px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#4ecdc4',
                fontWeight: '600',
                border: '1px solid rgba(78, 205, 196, 0.3)'
              }}>
                🤖 EDITH AI
              </div>
              <h3 style={{
                color: '#4ecdc4',
                marginBottom: '25px',
                fontSize: '24px',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
                fontWeight: '600'
              }}>
                � EDITH's Response:
              </h3>
              <div style={{
                fontSize: '18px',
                lineHeight: '1.8',
                textAlign: 'left',
                color: '#fff',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                whiteSpace: 'pre-wrap'
              }}>
                {edithResponse}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
