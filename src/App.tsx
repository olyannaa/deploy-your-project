import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import HomeRedirect from "./components/HomeRedirect";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import { AuthProvider } from "./contexts/AuthContext";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Organization from "./pages/Organization";
import ContractorDetails from "./pages/ContractorDetails";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";
import TimeTracking from "./pages/TimeTracking";
import Approvals from "./pages/Approvals";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/projects"
              element={
                <RequireAuth>
                  <Layout>
                    <Projects />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <RequireAuth>
                  <Layout>
                    <ProjectDetails />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/organization"
              element={
                <RequireAuth>
                  <Layout>
                    <Organization />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/organization/contractors/:id"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["admin", "accountant"]}>
                    <Layout>
                      <ContractorDetails />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Layout>
                    <Settings />
                  </Layout>
                </RequireAuth>
              }
            />
            <Route
              path="/tasks"
              element={
                <RequireAuth>
                  <RequireRole
                    allowedRoles={["admin", "gip", "executor", "accountant"]}
                  >
                    <Layout>
                      <Tasks />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/time-tracking"
              element={
                <RequireAuth>
                  <RequireRole
                    allowedRoles={["admin", "gip", "executor", "accountant"]}
                  >
                    <Layout>
                      <TimeTracking />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/approvals"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["admin"]} requireCanApproveSubcontracts>
                    <Layout>
                      <Approvals />
                    </Layout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
