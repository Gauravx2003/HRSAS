import api from "../../services/api";
import { useEffect, useState } from "react";
import { Search, Tag, Clock, CheckCircle2 } from "lucide-react";

interface FoundItem {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
}

const FoundItems = () => {
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFoundItems();
  }, []);

  const fetchFoundItems = () => {
    setIsLoading(true);
    api
      .get("/lost-and-found/found")
      .then((res) => {
        setFoundItems(res.data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const claimItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to claim this item?")) return;
    try {
      await api.patch(`/lost-and-found/${id}/claim`);
      alert("Item Claimed, waiting admin verification");
      fetchFoundItems();
    } catch (error) {
      console.error("Failed to claim item", error);
      alert("Failed to claim item. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CLAIMED":
        return "bg-green-100 text-green-700 border-green-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Found Items
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse items found in the premises
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Loading found items...</p>
        </div>
      ) : foundItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No found items</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no items reported as found.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {foundItems.map((item) => (
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
                    {item.status === "CLAIMED" && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    {item.status}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center text-xs text-slate-500 mb-4">
                      <Tag className="w-3 h-3 mr-1" />
                      {item.type}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {item.status === "OPEN" ? (
                    <button
                      onClick={() => claimItem(item.id)}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      Claim This Item
                    </button>
                  ) : (
                    <div className="w-full text-center text-sm text-slate-500 py-2 bg-slate-50 rounded-lg">
                      Item is {item.status.toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FoundItems;
