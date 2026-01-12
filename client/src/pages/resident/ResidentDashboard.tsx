import FoundItems from "./FoundItems";
import MyComplaints from "./MyComplaints";
import MyLostItems from "./MyLostItems";

const ResidentDashboard = () => {
  return (
    <div>
      <h1>Found Itms</h1>
      <FoundItems />

      <hr />

      <h1>My Complaints</h1>
      <MyComplaints />

      <hr />

      <h1>My Lost Items</h1>
      <MyLostItems />
    </div>
  );
};

export default ResidentDashboard;
