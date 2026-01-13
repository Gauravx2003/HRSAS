import { useEffect, useState } from "react";
import api from "../../services/api";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import Modal from "../../components/Modal";

interface Notice {
  id: string;
  title: string;
  content: string;
  expiresAt: string | null;
  createdAt: string;
}

const NoticeList = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const response = await api.get("/notices");
        setNotices(response.data);
      } catch (error) {
        console.error("Failed to fetch notices", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Notice Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Important announcements and updates
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Loading notices...</p>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No active notices
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no notices to display.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-40"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Notice Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider w-20"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {notices.map((notice) => (
                  <tr
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {notice.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ChevronRight className="w-5 h-5 text-slate-400 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notice Details Modal */}
      <Modal
        isOpen={!!selectedNotice}
        onClose={() => setSelectedNotice(null)}
        title={selectedNotice?.title || "Notice Details"}
      >
        {selectedNotice && (
          <div className="space-y-4">
            <div className="flex items-center text-sm text-slate-500 border-b border-slate-100 pb-4">
              <Calendar className="w-4 h-4 mr-1.5" />
              Posted on{" "}
              {new Date(selectedNotice.createdAt).toLocaleDateString(
                undefined,
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </div>

            <div className="prose prose-sm text-slate-700 max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">
                {selectedNotice.content}
              </p>
            </div>

            {selectedNotice.expiresAt && (
              <div className="pt-4 border-t border-slate-100 mt-6 text-xs text-amber-600 flex items-center">
                <span className="font-medium">Expires on:</span>
                <span className="ml-1">
                  {new Date(selectedNotice.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NoticeList;
