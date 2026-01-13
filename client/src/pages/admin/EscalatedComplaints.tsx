import api from "../../services/api";
import { useEffect, useState } from "react";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedStaff?: string;
}

const EscalatedComplaints = () => {
  const [escalatedComplaints, setEscalatedComplaints] = useState<Complaint[]>(
    []
  );

  useEffect(() => {
    api.get("/complaints/escalated").then((res) => {
      setEscalatedComplaints(res.data);
    });
  }, []);
  return (
    <div>
      <h2>Escalated Complaints</h2>

      <ul>
        {escalatedComplaints.map((complaint) => (
          <li key={complaint.id}>
            <h3>{complaint.title}</h3>
            <p>{complaint.description}</p>
            <p>{complaint.status}</p>
            {complaint.assignedStaff ? (
              <p>Assigned to: {complaint.assignedStaff}</p>
            ) : (
              <p>Not Assigned</p>
            )}

            <button>Reassign</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EscalatedComplaints;
