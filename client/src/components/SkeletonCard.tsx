export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
      {/* Top row: status/priority badges + date */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-slate-200 rounded" />
          <div className="h-6 w-16 bg-slate-200 rounded" />
        </div>
        <div className="h-4 w-20 bg-slate-200 rounded" />
      </div>

      {/* Title */}
      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />

      {/* Category tag */}
      <div className="mb-3">
        <div className="h-6 w-24 bg-slate-100 rounded" />
      </div>

      {/* Resident info row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Description lines */}
      <div className="space-y-2 mb-3">
        <div className="h-3.5 bg-slate-200 rounded w-full" />
        <div className="h-3.5 bg-slate-200 rounded w-5/6" />
      </div>

      {/* Assigned-to line */}
      <div className="h-3 bg-slate-200 rounded w-2/5 mb-3" />

      {/* Action button */}
      <div className="h-9 bg-slate-200 rounded-lg w-full" />
    </div>
  );
}
