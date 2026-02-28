'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PlanCard from '@/components/PlanCard';
import { FloorPlan } from '@/types/plan';

interface SavedPlan {
  id: string;
  name: string;
  plan_data: FloorPlan;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would include a Bearer token from Supabase auth
      const res = await fetch('/api/plans', {
        headers: { Authorization: 'Bearer demo-token' },
      });
      if (!res.ok) {
        // Not authenticated – show demo state
        setPlans([]);
        return;
      }
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      setError('Failed to load your plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/plans?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer demo-token' },
      });
      setPlans((p) => p.filter((plan) => plan.id !== id));
    } catch {
      alert('Failed to delete plan.');
    }
  };

  const handleOpen = (id: string) => {
    // In a real app, load plan into editor
    router.push(`/app?planId=${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="font-bold text-gray-800">Blueprint AI</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 font-medium">My Plans</span>
          </div>
          <Link
            href="/app"
            className="px-4 py-2 bg-sky-600 text-white text-sm rounded-xl hover:bg-sky-700 transition-colors font-medium flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Plan
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Floor Plans</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {plans.length > 0
              ? `${plans.length} saved plan${plans.length !== 1 ? 's' : ''}`
              : 'Your saved floor plans will appear here'}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchPlans}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
            >
              Retry
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No plans yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Create your first floor plan by describing your house to Blueprint AI.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                id={p.id}
                name={p.name}
                thumbnail={p.thumbnail}
                totalArea={p.plan_data?.totalArea}
                createdAt={p.created_at}
                updatedAt={p.updated_at}
                onDelete={handleDelete}
                onOpen={handleOpen}
              />
            ))}
            {/* Add new card */}
            <Link
              href="/app"
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-sky-300 hover:bg-sky-50 flex flex-col items-center justify-center min-h-48 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-sky-100 flex items-center justify-center mb-2 transition-colors">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm text-gray-500 group-hover:text-sky-700 font-medium">New Plan</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
