import { Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Dashboard } from "./pages/Dashboard";
import { MonitorNew } from "./pages/MonitorNew";
import { MonitorDetail } from "./pages/MonitorDetail";
import { MonitorImport } from "./pages/MonitorImport";
import { ReportsList } from "./pages/ReportsList";
import { ReportDetail } from "./pages/ReportDetail";

export function App() {
  return (
    <div className="app">
      <Nav />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitors/new" element={<MonitorNew />} />
          <Route path="/monitors/import" element={<MonitorImport />} />
          <Route path="/monitors/:id" element={<MonitorDetail />} />
          <Route path="/reports" element={<ReportsList />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
        </Routes>
      </main>
    </div>
  );
}
