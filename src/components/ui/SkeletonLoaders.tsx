export function StatCardSkeleton() {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 w-full">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-8 bg-slate-700 rounded w-1/2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/4"></div>
        </div>
        <div className="h-12 w-12 bg-slate-700 rounded-xl"></div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-5 bg-slate-700 rounded w-32"></div>
          <div className="h-3 bg-slate-700 rounded w-24"></div>
        </div>
        <div className="h-8 w-20 bg-slate-700 rounded-lg"></div>
      </div>
      <div className="h-64 bg-slate-700/50 rounded-lg"></div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 bg-slate-700 rounded w-48"></div>
          <div className="h-4 bg-slate-700 rounded w-64"></div>
        </div>
        <div className="h-10 w-40 bg-slate-700 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
