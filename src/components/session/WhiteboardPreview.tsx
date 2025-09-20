'use client';

import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useSnapshots,
  useSelectedSnapshot,
  selectSnapshot,
} from '@/lib/store/session.store';
import { Camera, Palette, Eraser, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCanvasAsImage, generateFilename } from '@/lib/utils/download';

export const WhiteboardPreview = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const snapshots = useSnapshots();
  const selectedSnapshot = useSelectedSnapshot();
  const { addSnapshot, selectSnapshot: setSelectedSnapshot } =
    useSessionStore();

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Set default styles
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Drawing functionality
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'eraser') return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'eraser') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const captureSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Create object URL for the image
      const imageUrl = URL.createObjectURL(blob);

      // Create snapshot object
      const snapshot = {
        id: `snapshot_${Date.now()}`,
        ts: Date.now(),
        thumbnailUrl: imageUrl,
        fullUrl: imageUrl,
        ocr: 'Captured whiteboard content',
        markers: [],
      };

      // Add to store
      addSnapshot(snapshot);

      toast.success('Snapshot captured successfully');
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      toast.error('Failed to capture snapshot');
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const filename = generateFilename('whiteboard', 'png');
    downloadCanvasAsImage(canvas, filename);
  };

  const loadSnapshot = (snapshot: any) => {
    setSelectedSnapshot(snapshot);

    // In a real app, this would load the snapshot image onto the canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Load image (simplified for demo)
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = snapshot.thumbnailUrl;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Whiteboard Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {snapshots.length} snapshots
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMarkers(!showMarkers)}
            >
              {showMarkers ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('pen')}
            >
              <Palette className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('eraser')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" onClick={clearCanvas}>
            Clear
          </Button>

          <Button variant="outline" size="sm" onClick={downloadCanvas}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <Button
            size="sm"
            onClick={captureSnapshot}
            className="bg-primary text-primary-foreground"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div className="relative h-full">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full border rounded-lg cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />

          {/* Overlay for markers */}
          {showMarkers && selectedSnapshot?.markers && (
            <div className="absolute inset-0 pointer-events-none">
              {selectedSnapshot.markers.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{
                    left: `${marker.x}px`,
                    top: `${marker.y}px`,
                    backgroundColor: marker.color,
                  }}
                  title={marker.label}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {snapshots.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No snapshots yet</p>
                <p className="text-sm">
                  Start drawing and capture your first snapshot
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
