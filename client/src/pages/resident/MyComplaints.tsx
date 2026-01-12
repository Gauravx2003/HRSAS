import { useEffect, useState } from "react";
import api from "../../services/api";

interface Complaint {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

const MyComplaints = () => {
  const [complaints, setMyComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    api.get("/complaints/my").then((res) => {
      setMyComplaints(res.data);
    });
  }, []);

  return (
    <div>
      <h2>My Complaints</h2>

      {complaints.length == 0 && <p>No complaints found</p>}

      {complaints.length > 0 && (
        <ul>
          {complaints.map((complaint) => (
            <li key={complaint.id}>
              <h3>{complaint.title}</h3>
              <p>{complaint.description}</p>
              <p>{complaint.type}</p>
              <p>{complaint.status}</p>
              <p>{complaint.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyComplaints;
