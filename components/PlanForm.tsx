'use client';

// ============================================================
// Blueprint AI — Plan Configuration Form
// ============================================================

import React, { useState } from 'react';
import { FloorPlan } from '@/types/plan';

export interface PlanFormValues {
  bedrooms: number;
  masterEnsuite: boolean;
  bathrooms: number;
  garage: 'none' | 'single' | 'double';
  livingRoom: boolean;
  diningRoom: boolean;
  openPlan: boolean;
  laundry: boolean;
  study: boolean;
  sizePreference: 'compact' | 'standard' | 'large';
}

const DEFAULTS: PlanFormValues = {
  bedrooms: 3,
  masterEnsuite: true,
  bathrooms: 2,
  garage: 'single',
  livingRoom: true,
  diningRoom: false,
  openPlan: true,
  laundry: true,
  study: false,
  sizePreference: 'standard',
};

interface PlanFormProps {
  onGenerate: (description: string) => void;
  isLoading: boolean;
  plan: FloorPlan | null;
}

export default function PlanForm({ onGenerate, isLoading, plan }: PlanFormProps) {
  const [values, setValues] = useState<PlanFormValues>(DEFAULTS);

  function set<K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function buildDescription(v: PlanFormValues): string {
    const parts: string[] = [];

    // Bedrooms
    if (v.bedrooms === 1) {
      parts.push('1 bedroom');
    } else {
      parts.push(`${v.bedrooms} bedrooms`);
      parts.push('master bedroom');
      if (v.masterEnsuite) parts.push('master with ensuite');
    }

    // Bathrooms
    const extraBaths = v.masterEnsuite ? v.bathrooms - 1 : v.bathrooms;
    if (extraBaths > 0) parts.push(`${extraBaths} bathroom${extraBaths > 1 ? 's' : ''}`);

    // Living areas
    if (v.openPlan) {
      parts.push('open plan kitchen, living and dining');
    } else {
      if (v.livingRoom) parts.push('living room');
      if (v.diningRoom) parts.push('separate dining room');
      parts.push('kitchen');
    }

    // Extras
    if (v.laundry) parts.push('laundry');
    if (v.study) parts.push('home office / study');

    // Garage
    if (v.garage === 'single') parts.push('single garage');
    else if (v.garage === 'double') parts.push('double garage');

    // Size
    const sizeHint =
      v.sizePreference === 'compact'
        ? 'compact, efficient layout'
        : v.sizePreference === 'large'
        ? 'generous room sizes, large layout'
        : 'standard room sizes';
    parts.push(sizeHint);

    return parts.join(', ');
  }

  const handleGenerate = () => {
    onGenerate(buildDescription(values));
  };

  const totalRooms =
    values.bedrooms +
    (values.masterEnsuite ? 1 : 0) +
    (values.bathrooms - (values.masterEnsuite ? 1 : 0)) +
    (values.openPlan ? 1 : (values.livingRoom ? 1 : 0) + (values.diningRoom ? 1 : 0)) +
    1 + // kitchen always
    (values.laundry ? 1 : 0) +
    (values.study ? 1 : 0) +
    (values.garage !== 'none' ? 1 : 0) +
    1; // hallway

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">House Configuration</h2>
            <p className="text-xs text-gray-400">Set rooms, then generate</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* ---- Bedrooms ---- */}
        <Section label="Bedrooms">
          <StepperRow
            label="Number of bedrooms"
            value={values.bedrooms}
            min={1}
            max={6}
            onChange={(v) => {
              set('bedrooms', v);
              // Auto-adjust bathrooms if needed
              if (v === 1) set('masterEnsuite', false);
            }}
          />
          {values.bedrooms >= 2 && (
            <Toggle
              label="Master bedroom with ensuite"
              checked={values.masterEnsuite}
              onChange={(v) => set('masterEnsuite', v)}
            />
          )}
        </Section>

        {/* ---- Bathrooms ---- */}
        <Section label="Bathrooms">
          <StepperRow
            label={values.masterEnsuite ? 'Additional bathrooms' : 'Number of bathrooms'}
            value={values.masterEnsuite ? Math.max(0, values.bathrooms - 1) : values.bathrooms}
            min={values.masterEnsuite ? 0 : 1}
            max={4}
            onChange={(v) => set('bathrooms', values.masterEnsuite ? v + 1 : v)}
          />
          {values.masterEnsuite && (
            <p className="text-xs text-gray-400 pt-0.5">
              + 1 ensuite off master bedroom
            </p>
          )}
        </Section>

        {/* ---- Living Areas ---- */}
        <Section label="Living Areas">
          <Toggle
            label="Open plan kitchen / living / dining"
            checked={values.openPlan}
            onChange={(v) => {
              set('openPlan', v);
              if (v) { set('livingRoom', true); set('diningRoom', true); }
            }}
          />
          {!values.openPlan && (
            <div className="space-y-2 pt-1">
              <Toggle
                label="Separate living room"
                checked={values.livingRoom}
                onChange={(v) => set('livingRoom', v)}
              />
              <Toggle
                label="Separate dining room"
                checked={values.diningRoom}
                onChange={(v) => set('diningRoom', v)}
              />
            </div>
          )}
        </Section>

        {/* ---- Garage ---- */}
        <Section label="Garage">
          <div className="flex gap-2">
            {(['none', 'single', 'double'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => set('garage', opt)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${
                  values.garage === opt
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt === 'none' ? 'None' : opt === 'single' ? 'Single' : 'Double'}
              </button>
            ))}
          </div>
        </Section>

        {/* ---- Additional Rooms ---- */}
        <Section label="Additional Rooms">
          <Toggle
            label="Laundry room"
            checked={values.laundry}
            onChange={(v) => set('laundry', v)}
          />
          <Toggle
            label="Home office / study"
            checked={values.study}
            onChange={(v) => set('study', v)}
          />
        </Section>

        {/* ---- Size Preference ---- */}
        <Section label="Room Size Preference">
          <div className="flex gap-2">
            {([
              { key: 'compact', label: 'Compact' },
              { key: 'standard', label: 'Standard' },
              { key: 'large', label: 'Generous' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => set('sizePreference', key)}
                className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  values.sizePreference === key
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* ---- Summary ---- */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-1.5">Plan summary</p>
          <SummaryRow icon="🛏" label={`${values.bedrooms} bedroom${values.bedrooms > 1 ? 's' : ''}${values.masterEnsuite && values.bedrooms >= 2 ? ' (master + ensuite)' : ''}`} />
          <SummaryRow icon="🚿" label={`${values.bathrooms} bathroom${values.bathrooms > 1 ? 's' : ''}${values.masterEnsuite ? ' incl. ensuite' : ''}`} />
          <SummaryRow icon="🛋" label={values.openPlan ? 'Open plan kitchen/living/dining' : `Kitchen${values.livingRoom ? ', living' : ''}${values.diningRoom ? ', dining' : ''}`} />
          <SummaryRow icon="🚗" label={values.garage === 'none' ? 'No garage' : `${values.garage === 'double' ? 'Double' : 'Single'} garage`} />
          {values.laundry && <SummaryRow icon="🧺" label="Laundry" />}
          {values.study && <SummaryRow icon="💻" label="Study / home office" />}
        </div>
      </div>

      {/* Generate Button */}
      <div className="px-5 py-4 border-t border-gray-200 bg-white">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating floor plan…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {plan ? 'Regenerate Plan' : 'Generate Floor Plan'}
            </>
          )}
        </button>
        {plan && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Drag rooms on the canvas to reposition them
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
    >
      <span className="text-sm text-gray-700">{label}</span>
      <div
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-sky-600' : 'bg-gray-200'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </div>
    </button>
  );
}

function StepperRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-200">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 font-bold text-sm flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-800 tabular-nums">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 font-bold text-sm flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
