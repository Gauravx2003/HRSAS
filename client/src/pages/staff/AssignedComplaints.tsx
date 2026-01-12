import api from "../../services/api";
import { useEffect, useState } from "react";

interface Complaint {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

const AssignedComplaints = () => {
  const [assigned, setAssigned] = useState<Complaint[]>([]);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    api.get("/staff/complaints").then((res) => {
      setAssigned(res.data);
    });
  };

  const updateStatus = (id: string, status: string) => {
    console.log(status);
    api.patch(`/staff/complaints/${id}/status`, { status }).then(() => {
      fetchComplaints();
    });
  };

  return (
    <div>
      <h2>Assigned Complaints</h2>
      {assigned.length == 0 && <p>No complaints found</p>}

      {assigned.length > 0 && (
        <ul>
          {assigned.map((complaint) => (
            <li key={complaint.id}>
              <h3>{complaint.title}</h3>
              <p>{complaint.description}</p>
              <p>{complaint.type}</p>
              <p>{complaint.status}</p>
              {complaint.status != "RESOLVED" && (
                <select
                  defaultValue=""
                  onChange={(e) => updateStatus(complaint.id, e.target.value)}
                >
                  <option value="" disabled>
                    Update Status
                  </option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              )}
              <p>{complaint.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AssignedComplaints;
