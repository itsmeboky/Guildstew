import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move } from "lucide-react";

export default function ImagePositionEditor({ imageUrl, position, zoom, onSave }) {
  const [localPosition, setLocalPosition] = useState(position || { x: 0, y: 0 });
  const [localZoom, setLocalZoom] = useState(zoom || 1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - localPosition.x,
      y: e.clientY - localPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setLocalPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setLocalZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setLocalZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = () => {
    onSave(localPosition, localZoom);
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full h-64 bg-[#1E2430] rounded-lg overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Position preview"
            className="absolute w-full h-full object-cover pointer-events-none"
            style={{
              transform: `translate(${localPosition.x}px, ${localPosition.y}px) scale(${localZoom})`,
              transformOrigin: 'center center'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Upload an image first
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
          <Move className="w-3 h-3 inline mr-1" />
          Drag to position
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleZoomOut}
          variant="outline"
          size="sm"
          disabled={!imageUrl}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center text-sm text-gray-400">
          Zoom: {Math.round(localZoom * 100)}%
        </div>
        <Button
          onClick={handleZoomIn}
          variant="outline"
          size="sm"
          disabled={!imageUrl}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      <Button
        onClick={handleSave}
        className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
        disabled={!imageUrl}
      >
        Save Position
      </Button>
    </div>
  );
}