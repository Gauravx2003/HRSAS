import { useEffect, useState } from "react";
import api from "../../services/api";
//import AttachmentsUpload from "../../components/AttachmentsUpload";
import { FileText, Plus } from "lucide-react";
import RaiseComplaintModal from "../../components/RaiseComplaintModal";
import StatusCard from "../../components/common/StatusCard";

interface Complaint {
  id: string;
  title: string;
  categoryName: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  staffName?: string;
  attachments?: Array<{ id: string; fileURL: string }>;
}

const MyComplaints = () => {
  const [complaints, setMyComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);

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

  //console.log(complaints);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            My Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track status of complaints you have reported
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Complaint
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-indigo-600"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No complaints yet</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {complaints.map((complaint) => (
            <StatusCard
              key={complaint.id}
              id={complaint.id}
              title={complaint.title}
              description={complaint.description}
              status={complaint.status}
              createdAt={complaint.createdAt}
              uploadUrl={`/complaints/${complaint.id}/attachments`} // Specific URL
              onSuccess={fetchComplaints}
              attachments={complaint.attachments}
            >
              {/* --- CHILD CONTENT: Specific to Complaints --- */}
              <div className="flex gap-2 text-xs">
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {complaint.categoryName}
                </span>
                {complaint.staffName ? (
                  <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    Assigned to: {complaint.staffName}
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-50 px-2 py-1 rounded">
                    Not assigned
                  </span>
                )}
              </div>
              {/* --------------------------------------------- */}
            </StatusCard>
          ))}
        </div>
      )}
      {isModalOpen && (
        <RaiseComplaintModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchComplaints}
        />
      )}
    </div>
  );
};

export default MyComplaints;
