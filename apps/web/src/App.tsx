import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from './components/ui/Feedback';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider, RequireAuth } from './features/auth/AuthContext';
import { SystemProvider } from './features/system';
import { AppLayout } from './layouts/AppLayout';
import { ActivityPage } from './pages/ActivityPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MatchHistoryPage } from './pages/MatchHistoryPage';
import { MatchSuggestionsPage } from './pages/MatchSuggestionsPage';
import { OutboxPage } from './pages/OutboxPage';

function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={<Compass className="h-5 w-5" />}
        title="Page not found"
        description="The page you’re looking for doesn’t exist."
        action={
          <Link to="/" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <SystemProvider>
                    <AppLayout />
                  </SystemProvider>
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="customers/:id/matches" element={<MatchSuggestionsPage />} />
              <Route path="matches" element={<MatchHistoryPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="outbox" element={<OutboxPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
