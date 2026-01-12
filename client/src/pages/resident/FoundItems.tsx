import api from "../../services/api";
import { useEffect, useState } from "react";

interface FoundItem {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
}

const FoundItems = () => {
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);

  useEffect(() => {
    api.get("/lost-and-found/found").then((res) => {
      setFoundItems(res.data);
    });
  }, []);

  const claimItem = async (id: string) => {
    await api.patch(`/lost-and-found/${id}/claim`);
    alert("Item Claimed, waiting admin verification");
  };

  return (
    <div>
      <h2>Found Items</h2>

      {foundItems.length == 0 && <p>No found items found</p>}

      {foundItems.length > 0 && (
        <ul>
          {foundItems.map((foundItem) => (
            <li key={foundItem.id}>
              <h3>{foundItem.title}</h3>
              <p>{foundItem.type}</p>
              {foundItem.status == "OPEN" && (
                <button onClick={() => claimItem(foundItem.id)}>
                  Claim Item
                </button>
              )}
              <p>{foundItem.status}</p>
              <p>{foundItem.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FoundItems;
