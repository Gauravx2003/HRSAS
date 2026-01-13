import { Link } from "react-router-dom";

const AdminSidebar = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/admin">Dashboard</Link>
        </li>
        <li>
          <Link to="/admin/notices">Notices</Link>
        </li>
        <li>
          <Link to="/admin/escalations">Escalations</Link>
        </li>
        <li>
          <Link to="/admin/lost-found">Lost Found</Link>
        </li>
      </ul>
    </nav>
  );
};

export default AdminSidebar;
