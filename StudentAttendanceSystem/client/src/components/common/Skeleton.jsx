import React from 'react';

/**
 * Base skeleton block with shimmer animation.
 * Usage: <Skeleton className="h-4 w-32 rounded-xl" />
 */
const Skeleton = ({ className = '', style }) => (
    <div className={`skeleton-shimmer ${className}`} style={style} />
);

/** 4-column stat card skeleton matching Dashboard stat cards */
export const SkeletonStatCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-3 w-24 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-3 w-28 rounded-lg" />
            </div>
        ))}
    </div>
);

/** Chart area skeleton */
export const SkeletonChart = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
        </div>
        <div className="h-72 w-full flex items-end gap-3 px-2">
            {[40, 65, 50, 80, 55, 70, 60].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                    <Skeleton className="w-full rounded-t-lg" style={{ height: `${h}%` }} />
                </div>
            ))}
        </div>
    </div>
);

/** Table row skeletons for StudentList */
export const SkeletonTableRows = ({ rows = 6 }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="border-b border-zinc-800 bg-zinc-900/70 px-4 py-3 flex gap-6">
            {[40, 120, 160, 80, 100].map((w, i) => (
                <Skeleton key={i} className="h-3 rounded-lg" style={{ width: w }} />
            ))}
        </div>
        {[...Array(rows)].map((_, i) => (
            <div
                key={i}
                className={`flex items-center gap-6 px-4 py-3.5 border-b border-zinc-800 ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950/40'}`}
            >
                <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                <Skeleton className="h-3 w-28 rounded-lg" />
                <Skeleton className="h-3 w-36 rounded-lg" />
                <Skeleton className="h-3 w-16 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-xl ml-auto" />
            </div>
        ))}
    </div>
);

/** Recent attendance list skeleton */
export const SkeletonList = ({ rows = 5 }) => (
    <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28 rounded-lg" />
                        <Skeleton className="h-2.5 w-20 rounded-lg" />
                    </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-xl" />
            </div>
        ))}
    </div>
);

export default Skeleton;
