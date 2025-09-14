import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TimeTracking from "./pages/TimeTracking";
import Vacation from "./pages/Vacation";
import Scheduling from "./pages/Scheduling";
import Employees from "./pages/Employees";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

// Import debug and test utilities for development
import "@/lib/debug-auth";
import "@/lib/auth-test-guide";
import "@/lib/registration-debug";
import { setupGlobalErrorHandler } from "@/lib/database-retry";

// Setup global error handling for database operations
setupGlobalErrorHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Retry authentication-related errors
        if (error && typeof error === 'object' && 'code' in error) {
          const pgError = error as any;
          const retryableCodes = ['PGRST301', 'PGRST300', 'PGRST302', '401', '403'];
          if (retryableCodes.includes(pgError.code)) {
            return failureCount < 3;
          }
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
            <Route path="/vacation" element={<ProtectedRoute><Vacation /></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute><Scheduling /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/debug" element={<Debug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
