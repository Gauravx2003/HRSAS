import { useEffect, useState } from "react";
import api from "../../services/api";
import AttachmentsUpload from "../../components/AttachmentsUpload";
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";

interface Complaint {
  id: string;
  categoryName: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

const MyComplaints = () => {
  const [complaints, setMyComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    setIsLoading(true);
    api
      .get("/complaints/my")
      .then((res) => {
        setMyComplaints(res.data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "REJECTED":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      default:
        return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            My Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage your filed complaints
          </p>
        </div>
        <div>{/* Placeholder for future filters or actions */}</div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No complaints filed
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't submitted any complaints yet. When you do, they will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {complaints.map((complaint) => (
            <div
              key={complaint.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                      complaint.status
                    )}`}
                  >
                    {getStatusIcon(complaint.status)}
                    {complaint.status}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(complaint.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1">
                  {complaint.categoryName}
                </h3>

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {complaint.description}
                </p>

                <div className="mt-4">
                  <AttachmentsUpload
                    uploadUrl={`/complaints/${complaint.id}/attachments`}
                    onSuccess={() => {
                      fetchComplaints();
                      // Ideally use a toast here
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
