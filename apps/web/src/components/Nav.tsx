import { NavLink } from "react-router-dom";

export function Nav() {
  return (
    <nav className="nav">
      <span className="nav-brand">Site Monitor</span>
      <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
        Dashboard
      </NavLink>
      <NavLink to="/monitors/new" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
        Add Monitor
      </NavLink>
      <NavLink to="/monitors/import" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
        Import CSV
      </NavLink>
      <NavLink to="/reports" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
        Reports
      </NavLink>
    </nav>
  );
}
