import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ConnectionMonitor from './components/ConnectionMonitor';
import Layout from './components/Layout';
import { CircularProgress, Box } from '@mui/material';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CasesList = lazy(() => import('./pages/cases/CasesList'));
const CaseForm = lazy(() => import('./pages/cases/CaseForm'));
const CaseDetail = lazy(() => import('./pages/cases/CaseDetail'));
const ClientsList = lazy(() => import('./pages/clients/ClientsList'));
const ClientForm = lazy(() => import('./pages/clients/ClientForm'));
const ClientDetail = lazy(() => import('./pages/clients/ClientDetail'));
const DocumentsList = lazy(() => import('./pages/documents/DocumentsList'));
const InvoicesList = lazy(() => import('./pages/invoices/InvoicesList'));
const InvoiceForm = lazy(() => import('./pages/invoices/InvoiceForm'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const HearingsList = lazy(() => import('./pages/hearings/HearingsList'));
const TasksList = lazy(() => import('./pages/tasks/TasksList'));
const GlobalSearch = lazy(() => import('./pages/search/GlobalSearch'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const EcourtsSearch = lazy(() => import('./pages/ecourts/EcourtsSearch'));
const EcourtsCaseDetail = lazy(() => import('./pages/ecourts/EcourtsCaseDetail'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectionMonitor>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="cases" element={<CasesList />} />
                <Route path="cases/new" element={<CaseForm />} />
                <Route path="cases/:id" element={<CaseDetail />} />
                <Route path="cases/:id/edit" element={<CaseForm />} />
                <Route path="clients" element={<ClientsList />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />
                <Route path="documents" element={<DocumentsList />} />
                <Route path="invoices" element={<InvoicesList />} />
                <Route path="invoices/new" element={<InvoiceForm />} />
                <Route path="invoices/:id" element={<InvoiceDetail />} />
                <Route path="invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="hearings" element={<HearingsList />} />
                <Route path="tasks" element={<TasksList />} />
                <Route path="search" element={<GlobalSearch />} />
                <Route path="team" element={<TeamManagement />} />
                <Route path="activity-log" element={<ActivityLog />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
                <Route path="ecourts" element={<EcourtsSearch />} />
                <Route path="ecourts/:cnr" element={<EcourtsCaseDetail />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ConnectionMonitor>
      </AuthProvider>
    </BrowserRouter>
  );
}
