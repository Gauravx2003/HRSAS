import { Leaf, Recycle, Ghost, Gauge } from "lucide-react";

interface WastageStat {
  id: string;
  date: string;
  mealType: string;
  items: string;
  totalResidents: number;
  optedIn: number;
  scanned: number;
  mealsSaved: number;
  savedPercent: number;
  mealsWasted: number;
  wastePercent: number;
  efficiencyPercent: number;
}

interface Props {
  data: {
    dailyStats: WastageStat[];
    summary: {
      averageSavings: number;
      averageWaste: number;
      averageEfficiency: number;
    };
  };
}

const MessWastageStats = ({ data }: Props) => {
  return (
    <div className="space-y-6">
      {/* Metric Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              App ROI (Saved)
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {data.summary.averageSavings}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Total meals prevented from overcooking
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
              <Ghost className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Ghost Rate (Wasted)
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {data.summary.averageWaste}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Avg. no-shows for booked meals
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Kitchen Efficiency
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {data.summary.averageEfficiency}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Real consumption vs prepared food
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Recycle className="w-4 h-4 text-blue-500" />
            Meal Wise Performance
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Last 30 Meals
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider">
                  Date & Meal
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-center">
                  ROI (Saved)
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-center">
                  Wasted (No-Show)
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-right">
                  Efficiency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.dailyStats.map((stat) => (
                <tr
                  key={stat.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {stat.mealType}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        {new Date(stat.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-emerald-600">
                          {stat.mealsSaved}
                        </span>
                        {/* 👇 Added the total capacity context here */}
                        <span className="text-xs font-medium text-slate-400">
                          / {stat.totalResidents}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {stat.savedPercent}% ROI
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-rose-500">
                        {stat.mealsWasted} meals
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {stat.wastePercent}% ghosted
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden md:block">
                        <div
                          className={`h-full rounded-full ${stat.efficiencyPercent > 80 ? "bg-green-500" : stat.efficiencyPercent > 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{
                            width: `${Math.max(0, Math.min(100, stat.efficiencyPercent))}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-700 min-w-11.25">
                        {stat.efficiencyPercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MessWastageStats;
