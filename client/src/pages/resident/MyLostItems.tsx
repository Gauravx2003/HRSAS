import { useEffect, useState } from "react";
import api from "../../services/api";

interface LostItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

const MyLostItems = () => {
  const [lostItems, setLostItems] = useState<LostItem[]>([]);

  useEffect(() => {
    api.get("/lost-and-found/my").then((res) => {
      setLostItems(res.data);
    });
  }, []);

  return (
    <div>
      <h2>My Lost Items</h2>

      {lostItems.length == 0 && <p>No lost items found</p>}

      {lostItems.length > 0 && (
        <ul>
          {lostItems.map((lostItem) => (
            <li key={lostItem.id}>
              <h3>{lostItem.title}</h3>
              <p>{lostItem.status}</p>
              <p>{lostItem.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyLostItems;
