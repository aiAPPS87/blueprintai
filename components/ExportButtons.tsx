'use client';

import React, { useRef, useState } from 'react';
import { FloorPlan } from '@/types/plan';
import { renderFloorPlanToCanvas } from '@/lib/jpgRenderer';

interface ExportButtonsProps {
  plan: FloorPlan | null;
  projectName: string;
}

export default function ExportButtons({ plan, projectName }: ExportButtonsProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDxf, setExportingDxf] = useState(false);

  // ---- PDF Export (free) ----
  const handlePdfExport = async () => {
    if (!plan || exportingPdf) return;
    setExportingPdf(true);
    try {
      // Render plan to offscreen canvas
      const canvas = document.createElement('canvas');
      renderFloorPlanToCanvas(plan, canvas, { projectName });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Dynamic import keeps jspdf out of initial bundle
      const { jsPDF } = await import('jspdf');

      // Choose orientation based on canvas aspect ratio
      const landscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a3',
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Scale image to fill page (preserving aspect ratio)
      const imgRatio = canvas.width / canvas.height;
      let w = pageW, h = pageW / imgRatio;
      if (h > pageH) { h = pageH; w = pageH * imgRatio; }
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, w, h, undefined, 'FAST');
      pdf.save(`${projectName.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  // ---- DXF Export (free) ----
  const handleDxfExport = async () => {
    if (!plan || exportingDxf) return;
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

  const disabled = !plan;

  return (
    <div className="flex items-center gap-2">
      {/* PDF — free */}
      <button
        onClick={handlePdfExport}
        disabled={disabled || exportingPdf}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Export as PDF (A3)"
      >
        {exportingPdf ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
        PDF
      </button>

      {/* DXF — free */}
      <button
        onClick={handleDxfExport}
        disabled={disabled || exportingDxf}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Export as DXF (CAD)"
      >
        {exportingDxf ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        DXF
      </button>
    </div>
  );
}
