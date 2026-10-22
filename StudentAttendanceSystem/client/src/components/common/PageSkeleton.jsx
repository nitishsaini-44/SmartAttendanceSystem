import React from 'react';

/**
 * Lightweight page-level skeleton shown by Suspense while lazy chunks load.
 * Matches the general page layout (header bar + content blocks).
 */
const PageSkeleton = () => (
    <div className="space-y-6 animate-fadeIn">
        {/* Header card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="skeleton-shimmer h-6 w-48 rounded-lg mb-2" />
            <div className="skeleton-shimmer h-3 w-32 rounded-lg" />
        </div>
        {/* Stat cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
                    <div className="skeleton-shimmer h-3 w-20 rounded-lg" />
                    <div className="skeleton-shimmer h-7 w-12 rounded-lg" />
                </div>
            ))}
        </div>
        {/* Content block */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="skeleton-shimmer h-5 w-36 rounded-lg mb-6" />
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton-shimmer h-12 w-full rounded-xl" />
                ))}
            </div>
        </div>
    </div>
);

export default PageSkeleton;
