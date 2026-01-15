import { Link } from "react-router-dom";

const StaffSidebar = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/staff">Dashboard</Link>
        </li>
        <li>
          <Link to="/staff/notices">Notices</Link>
        </li>
        <li>
          <Link to="/staff/complaints">Assigned Complaints</Link>
        </li>
      </ul>
    </nav>
  );
};

export default StaffSidebar;
