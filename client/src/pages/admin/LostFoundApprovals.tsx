import { useEffect, useState } from "react";
import api from "../../services/api";

interface ClaimedItem {
  id: string;
  title: string;
  description: string;
  status: string;
}

const LostFoundApprovals = () => {
  const [foundItems, setFoundItems] = useState<ClaimedItem[]>([]);

  const fetchFoundItems = async () => {
    const response = await api.get("/lost-and-found/found");
    setFoundItems(response.data);
  };

  const approveItem = async (id: string) => {
    await api.patch(`lost-and-found/${id}/close`);
    fetchFoundItems();
  };

  useEffect(() => {
    fetchFoundItems();
  }, []);

  return (
    <div>
      <h2>Claimed Items</h2>
      <ul>
        {foundItems.map((item) => (
          <li key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p>{item.status}</p>
            <button onClick={() => approveItem(item.id)}>Approve</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LostFoundApprovals;
