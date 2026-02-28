'use client';

import React from 'react';
import Link from 'next/link';

interface PlanCardProps {
  id: string;
  name: string;
  thumbnail?: string;
  totalArea?: number;
  createdAt: string;
  updatedAt: string;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

export default function PlanCard({
  id,
  name,
  thumbnail,
  totalArea,
  createdAt,
  updatedAt,
  onDelete,
  onOpen,
}: PlanCardProps) {
  const updated = new Date(updatedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-40 bg-gray-100 cursor-pointer relative"
        onClick={() => onOpen(id)}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-sky-600 bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
          <span className="text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-sky-600 px-3 py-1.5 rounded-lg">
            Open Plan
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-gray-800 truncate">{name}</h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-500">
            {totalArea ? `${totalArea}m²` : 'No area'} · {updated}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${name}"?`)) onDelete(id);
            }}
            className="text-xs text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
