import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { HostEditor } from "./pages/HostEditor";
import { TeamSettings } from "./pages/TeamSettings";

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

// react-router reuses the same component instance across sibling routes that render
// the same component type, so /hosts/new and /hosts/:hostId/edit (and edit -> edit for
// a different host) would otherwise leak stale form state between navigations.
function HostEditorRoute() {
  const { hostId } = useParams();
  return <HostEditor key={hostId ?? "new"} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/hosts/new" element={<HostEditorRoute />} />
        <Route path="/hosts/:hostId/edit" element={<HostEditorRoute />} />
        {/* Workspace is rendered persistently by AppShell (see below) so open SSH
            sessions survive navigating to other pages; this route only claims the URL. */}
        <Route path="/sessions" element={null} />
        <Route path="/teams" element={<TeamSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
