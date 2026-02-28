'use client';

import React, { useRef, useState } from 'react';
import { FloorPlan } from '@/types/plan';
import { renderFloorPlanToCanvas, canvasToJpegBlob } from '@/lib/jpgRenderer';

interface ExportButtonsProps {
  plan: FloorPlan | null;
  projectName: string;
  canDownload: boolean;
  onUpgrade: () => void;
}

export default function ExportButtons({
  plan,
  projectName,
  canDownload,
  onUpgrade,
}: ExportButtonsProps) {
  const [exportingDxf, setExportingDxf] = useState(false);
  const [exportingJpg, setExportingJpg] = useState(false);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleDxfExport = async () => {
    if (!plan || exportingDxf) return;
    if (!canDownload) { onUpgrade(); return; }

    setExportingDxf(true);
    try {
      const res = await fetch('/api/export/dxf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, projectName }),
      });
      if (!res.ok) throw new Error('DXF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '-')}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('DXF export failed. Please try again.');
    } finally {
      setExportingDxf(false);
    }
  };

  const handleJpgExport = async () => {
    if (!plan || exportingJpg) return;

    setExportingJpg(true);
    try {
      const canvas = hiddenCanvasRef.current || document.createElement('canvas');
      renderFloorPlanToCanvas(plan, canvas, {
        watermark: !canDownload,
        projectName,
      });
      const blob = await canvasToJpegBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '-')}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('JPG export failed. Please try again.');
    } finally {
      setExportingJpg(false);
    }
  };

  const disabled = !plan;

  return (
    <div className="flex items-center gap-2">
      {/* JPG — available on free tier (watermarked) */}
      <button
        onClick={handleJpgExport}
        disabled={disabled || exportingJpg}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={canDownload ? 'Export as JPG' : 'Export as JPG (watermarked)'}
      >
        {exportingJpg ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        JPG{!canDownload && ' ★'}
      </button>

      {/* DXF — paid only */}
      <button
        onClick={handleDxfExport}
        disabled={disabled || exportingDxf}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
          canDownload
            ? 'bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40'
            : 'bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40'
        } disabled:cursor-not-allowed`}
        title={canDownload ? 'Export as DXF' : 'Unlock DXF export'}
      >
        {exportingDxf ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        {canDownload ? 'DXF' : 'Unlock DXF — $9'}
      </button>

      {/* Hidden canvas for JPG rendering */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
    </div>
  );
}
