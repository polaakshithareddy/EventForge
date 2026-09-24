import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import PublicEventsPage from '../pages/PublicEventsPage';
import PublicEventDetailPage from '../pages/PublicEventDetailPage';
import EventWizardPage from '../pages/EventWizardPage';
import VenuesPage from '../pages/VenuesPage';
import MyTicketsPage from '../pages/MyTicketsPage';
import EventAttendeesPage from '../pages/EventAttendeesPage';
import EventSessionsPage from '../pages/EventSessionsPage';
import EventSponsorsPage from '../pages/EventSponsorsPage';
import EventAnalyticsPage from '../pages/EventAnalyticsPage';
import ProtectedRoute from '../components/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<PublicEventsPage />} />
        <Route path="events/:slug" element={<PublicEventDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="my-tickets" element={<MyTicketsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/events/new" element={<EventWizardPage />} />
          <Route path="dashboard/events/:id/edit" element={<EventWizardPage />} />
          <Route path="dashboard/events/:id/sessions" element={<EventSessionsPage />} />
          <Route path="dashboard/events/:id/attendees" element={<EventAttendeesPage />} />
          <Route path="dashboard/events/:id/sponsors" element={<EventSponsorsPage />} />
          <Route path="dashboard/events/:id/analytics" element={<EventAnalyticsPage />} />
          <Route path="dashboard/venues" element={<VenuesPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
