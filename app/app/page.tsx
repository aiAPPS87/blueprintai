'use client';

// ============================================================
// Blueprint AI — Main Editor Page
// ============================================================

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FloorPlan } from '@/types/plan';
import PlanForm from '@/components/PlanForm';
import ExportButtons from '@/components/ExportButtons';
import ErrorBoundary from '@/components/ErrorBoundary';

// Konva must be loaded client-side only
const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Loading canvas…</div>
    </div>
  ),
});

// Extracted so it can be wrapped in <Suspense> — required by Next.js for useSearchParams
function SearchParamsHandler({ onGenerate }: { onGenerate: (prompt: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt) onGenerate(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function EditorPage() {
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [planName, setPlanName] = useState('Untitled Plan');
  const [editingName, setEditingName] = useState(false);
  const [history, setHistory] = useState<FloorPlan[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  // Push plan to undo history
  const pushHistory = useCallback((p: FloorPlan) => {
    setHistory((h) => [...h.slice(0, historyIdx + 1), p].slice(-20));
    setHistoryIdx((i) => Math.min(i + 1, 19));
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx((i) => i - 1);
      setPlan(history[historyIdx - 1]);
    }
  };

  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx((i) => i + 1);
      setPlan(history[historyIdx + 1]);
    }
  };

  // ---- Generate from form description ----
  const handleGenerate = async (description: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const newPlan: FloorPlan = { ...data.plan, name: planName };
      setPlan(newPlan);
      pushHistory(newPlan);
      setSelectedRoomId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Plan canvas change (drag/resize) ----
  const handlePlanChange = useCallback((updated: FloorPlan) => {
    setPlan(updated);
    pushHistory(updated);
  }, [pushHistory]);

  // ---- Save ----
  const handleSave = async () => {
    if (!plan) return;
    setSaveStatus('saving');
    try {
      setPlan({ ...plan, name: planName });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const saveLabel = {
    idle: 'Save',
    saving: 'Saving…',
    saved: 'Saved ✓',
    error: 'Error',
  }[saveStatus];

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ---- Top Bar ---- */}
      <header className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0 z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-sm hidden sm:inline">Blueprint AI</span>
        </Link>

        {/* Plan name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
              className="text-sm font-semibold text-gray-800 border-b-2 border-sky-500 outline-none bg-transparent w-full max-w-xs px-1"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-gray-800 hover:text-sky-600 transition-colors truncate max-w-xs px-1 flex items-center gap-1"
            >
              {planName}
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {plan && (
            <p className="text-xs text-gray-400 px-1">
              {plan.width}m × {plan.depth}m · {plan.totalArea}m² · {plan.rooms.length} rooms
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={undo}
              disabled={historyIdx <= 0}
              className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
              title="Undo"
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={historyIdx >= history.length - 1}
              className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs border-l border-gray-200"
              title="Redo"
            >
              ↪
            </button>
          </div>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
              showGrid
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Grid
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!plan || saveStatus === 'saving'}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-40 ${
              saveStatus === 'saved'
                ? 'bg-green-50 border-green-300 text-green-700'
                : saveStatus === 'error'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {saveLabel}
          </button>

          {/* Export */}
          <ExportButtons
            plan={plan}
            projectName={planName}
          />

          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors"
          >
            My Plans
          </Link>
        </div>
      </header>

      {/* Reads ?prompt= from URL and triggers auto-generate */}
      <Suspense fallback={null}>
        <SearchParamsHandler onGenerate={handleGenerate} />
      </Suspense>

      {/* ---- Main Content ---- */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Plan Form */}
        <div className="w-72 xl:w-80 shrink-0 flex flex-col overflow-hidden">
          <PlanForm
            onGenerate={handleGenerate}
            isLoading={isLoading}
            plan={plan}
          />
        </div>

        {/* Right: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm shrink-0">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          <ErrorBoundary>
            <CanvasEditor
              plan={plan}
              onPlanChange={handlePlanChange}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              showGrid={showGrid}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* ---- Status Bar ---- */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-400 shrink-0">
        <span>
          {plan
            ? `${plan.rooms.length} rooms · ${plan.totalArea}m² · ${plan.width}m × ${plan.depth}m`
            : 'Configure your house and click Generate'}
        </span>
        <span className="hidden sm:block">Blueprint AI · Concept plans only, not for construction</span>
        <span className="hidden md:block">Scroll to zoom · Alt+drag to pan</span>
      </footer>
    </div>
  );
}
