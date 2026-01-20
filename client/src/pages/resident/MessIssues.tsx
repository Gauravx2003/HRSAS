import api from "../../services/api";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Plus } from "lucide-react";
import RaiseMessIssue from "../../components/RaiseMessIssue";
import StatusCard from "../../components/common/StatusCard";

interface Issue {
  id: string;
  issueDescription: string;
  category: string;
  status: string;
  issueTitle: string;
  createdAt: string;
  resolvedAt: string;
}

const MessIssues = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/mess-issues/my");
      setIssues(response.data);
    } catch (error) {
      console.error("Failed to fetch mess issues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toUpperCase()) {
      case "FOOD":
        return "bg-orange-100 text-orange-700";
      case "HYGIENE":
        return "bg-purple-100 text-purple-700";
      case "SERVICE":
        return "bg-blue-100 text-blue-700";
      case "INFRASTRUCTURE":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Mess Issues
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track status of mess issues you have reported
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Issue
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No mess issues yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Your reported mess issues will appear here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {issues.map((issue) => (
            <StatusCard
              key={issue.id}
              id={issue.id}
              title={issue.issueTitle} // Note: mapping 'issueTitle' to generic 'title' prop
              description={issue.issueDescription}
              status={issue.status}
              createdAt={issue.createdAt}
              uploadUrl={`/mess-issues/${issue.id}/attachments`}
              onSuccess={fetchIssues}
            >
              {/* --- CHILD CONTENT: Specific to Mess Issues --- */}
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryColor(issue.category)}`}
              >
                {issue.category.replace("_", " ")}
              </span>
              {/* --------------------------------------------- */}
            </StatusCard>
          ))}
        </div>
      )}
      {isModalOpen && (
        <RaiseMessIssue
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchIssues}
        />
      )}
    </div>
  );
};

export default MessIssues;
