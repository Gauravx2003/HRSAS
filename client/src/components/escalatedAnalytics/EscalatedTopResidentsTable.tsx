import { User } from "lucide-react";

interface ResidentData {
  residentName: string;
  count: number;
}

interface Props {
  data: ResidentData[];
}

const EscalatedTopResidentsTable = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          Residents with Most Escalations
        </h3>
        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
          No escalation data available
        </div>
      </div>
    );
  }

  const maxCount = data[0]?.count || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          Residents with Most Escalations
        </h3>
      </div>
      <div className="divide-y divide-slate-50">
        {data.map((item, index) => {
          const barWidth = Math.round((item.count / maxCount) * 100);

          return (
            <div
              key={item.residentName}
              className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-indigo-600">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {item.residentName}
                </p>
                <div className="mt-1 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-700 ml-2">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EscalatedTopResidentsTable;
