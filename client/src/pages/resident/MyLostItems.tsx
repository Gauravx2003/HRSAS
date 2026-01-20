import { useEffect, useState } from "react";
import api from "../../services/api";
import { Search, MapPin, Clock } from "lucide-react";

interface LostItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  description?: string; // Assuming description is available or can be added
}

const MyLostItems = () => {
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLostItems();
  }, []);

  const fetchLostItems = () => {
    setIsLoading(true);
    api
      .get("/lost-and-found/my")
      .then((res) => {
        setLostItems(res.data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FOUND":
        return "bg-green-100 text-green-700 border-green-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            My Lost Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track status of items you have reported lost
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Loading your items...</p>
        </div>
      ) : lostItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No lost items reported
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't reported any lost items yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {lostItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {item.title}
                </h3>

                {/* Placeholder for location or description if available in future */}
                <div className="flex items-center text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>Reported Location details...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLostItems;
