import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { HostEditor } from "./pages/HostEditor";
import { KubeClusters } from "./pages/KubeClusters";
import { KubeClusterEditor } from "./pages/KubeClusterEditor";
import { DbConnections } from "./pages/DbConnections";
import { DbConnectionEditor } from "./pages/DbConnectionEditor";
import { PortScanner } from "./pages/PortScanner";
import { DnsLookup } from "./pages/DnsLookup";
import { DnsPropagation } from "./pages/DnsPropagation";
import { IpChecker } from "./pages/IpChecker";
import { TeamSettings } from "./pages/TeamSettings";

// Lazy-loaded: this page pulls in Monaco (~4MB), which must not be part of the main bundle.
const CodeEditor = lazy(() => import("./pages/CodeEditor").then((m) => ({ default: m.CodeEditor })));

// "/" is special: logged-out visitors see the marketing Home page there instead of
// being redirected to /login, since it's the product's landing page. Every other
// protected route still redirects unauthenticated visitors to /login as before.
function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!user) {
    if (location.pathname === "/") return <Home />;
    return <Navigate to="/login" replace />;
  }
  return <AppShell />;
}

// react-router reuses the same component instance across sibling routes that render
// the same component type, so /hosts/new and /hosts/:hostId/edit (and edit -> edit for
// a different host) would otherwise leak stale form state between navigations.
function HostEditorRoute() {
  const { hostId } = useParams();
  return <HostEditor key={hostId ?? "new"} />;
}

function KubeClusterEditorRoute() {
  const { clusterId } = useParams();
  return <KubeClusterEditor key={clusterId ?? "new"} />;
}

function DbConnectionEditorRoute() {
  const { connectionId } = useParams();
  return <DbConnectionEditor key={connectionId ?? "new"} />;
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
        <Route path="/kubernetes" element={<KubeClusters />} />
        <Route path="/kubernetes/new" element={<KubeClusterEditorRoute />} />
        <Route path="/kubernetes/:clusterId/edit" element={<KubeClusterEditorRoute />} />
        <Route path="/databases" element={<DbConnections />} />
        <Route path="/databases/new" element={<DbConnectionEditorRoute />} />
        <Route path="/databases/:connectionId/edit" element={<DbConnectionEditorRoute />} />
        <Route path="/port-scanner" element={<PortScanner />} />
        <Route path="/dns-lookup" element={<DnsLookup />} />
        <Route path="/dns-propagation" element={<DnsPropagation />} />
        <Route path="/ip-checker" element={<IpChecker />} />
        <Route
          path="/editor"
          element={
            <Suspense fallback={<div className="text-sm text-slate-500">Loading editor…</div>}>
              <CodeEditor />
            </Suspense>
          }
        />
        {/* Workspace is rendered persistently by AppShell (see below) so open SSH/Kubernetes
            sessions survive navigating to other pages; this route only claims the URL. */}
        <Route path="/sessions" element={null} />
        <Route path="/teams" element={<TeamSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
