'use client';

// ============================================================
// Blueprint AI — Main Editor Page
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FloorPlan, ChatMessage } from '@/types/plan';
import ChatPanel from '@/components/ChatPanel';
import ExportButtons from '@/components/ExportButtons';
import { v4 as uuidv4 } from 'uuid';

// Konva must be loaded client-side only
const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Loading canvas…</div>
    </div>
  ),
});

export default function EditorPage() {
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [planName, setPlanName] = useState('Untitled Plan');
  const [editingName, setEditingName] = useState(false);
  const [history, setHistory] = useState<FloorPlan[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  // Push plan to history
  const pushHistory = useCallback((p: FloorPlan) => {
    setHistory((h) => {
      const newH = [...h.slice(0, historyIdx + 1), p];
      return newH.slice(-20); // Keep last 20 states
    });
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

  // Add message to chat
  const addMessage = (role: 'user' | 'assistant', content: string): ChatMessage => {
    const msg: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, msg]);
    return msg;
  };

  // ---- Generate ----
  const handleGenerate = async (userInput: string) => {
    addMessage('user', userInput);
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const newPlan = { ...data.plan, name: planName };
      setPlan(newPlan);
      pushHistory(newPlan);
      addMessage('assistant', data.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addMessage('assistant', `Sorry, I encountered an error: ${msg}\n\nPlease try again or rephrase your description.`);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Refine ----
  const handleRefine = async (instruction: string) => {
    if (!plan) return;
    addMessage('user', instruction);
    setIsLoading(true);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: plan,
          userInstruction: instruction,
          conversationHistory: messages.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refinement failed');

      const updated = { ...data.plan, name: planName };
      setPlan(updated);
      pushHistory(updated);
      addMessage('assistant', data.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      addMessage('assistant', `Sorry, I couldn't apply that change: ${msg}\n\nTry rephrasing, e.g. "make bedroom 1 larger" or "add a second bathroom".`);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Plan canvas change (drag/resize) ----
  const handlePlanChange = useCallback((updated: FloorPlan) => {
    setPlan(updated);
    pushHistory(updated);
  }, [pushHistory]);

  // ---- Save plan ----
  const handleSave = async () => {
    if (!plan) return;
    setSaveStatus('saving');
    try {
      // In a real app, get the auth token from Supabase session
      // For now, just update the plan name and show saved
      const savedPlan = { ...plan, name: planName };
      setPlan(savedPlan);
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
        <Link href="/" className="flex items-center gap-2 mr-2">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={undo}
              disabled={historyIdx <= 0}
              className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={historyIdx >= history.length - 1}
              className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs border-l border-gray-200"
              title="Redo (Ctrl+Y)"
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
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              saveStatus === 'saved'
                ? 'bg-green-50 border-green-300 text-green-700'
                : saveStatus === 'error'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-40`}
          >
            {saveLabel}
          </button>

          {/* Export */}
          <ExportButtons
            plan={plan}
            projectName={planName}
            canDownload={false} // Set to true for paid users
            onUpgrade={() => alert('Upgrade to Pro to download DXF files!')}
          />

          {/* Dashboard link */}
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-white hover:bg-gray-800 transition-colors"
          >
            My Plans
          </Link>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel (30%) */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col overflow-hidden border-r border-gray-200">
          <ChatPanel
            messages={messages}
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            isLoading={isLoading}
            hasPlan={!!plan}
          />
        </div>

        {/* Right: Canvas Editor (70%) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CanvasEditor
            plan={plan}
            onPlanChange={handlePlanChange}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            showGrid={showGrid}
          />
        </div>
      </div>

      {/* ---- Bottom Status Bar ---- */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-400 shrink-0">
        <span>
          {plan
            ? `${plan.rooms.length} rooms · ${plan.totalArea}m² floor area`
            : 'No plan loaded'}
        </span>
        <span>Blueprint AI · Concept plans only, not for construction</span>
        <span>Alt+drag to pan · Scroll to zoom</span>
      </footer>
    </div>
  );
}
