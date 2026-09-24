import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrgEvents, deleteEvent } from '../api/events';
import { getVenues } from '../api/venues';
import { logout } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiCalendar,
  FiMapPin,
  FiEdit,
  FiTrash2,
  FiExternalLink,
  FiLogOut,
  FiEye,
  FiUsers,
  FiClock,
  FiAward,
  FiBarChart2,
} from 'react-icons/fi';

export default function DashboardPage() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearUser();
      navigate('/login');
    },
  });

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['org-events', statusFilter],
    queryFn: () => getOrgEvents({ status: statusFilter, limit: 50 }),
  });
  const events = eventsData?.data?.events || [];

  const { data: venuesData } = useQuery({
    queryKey: ['org-venues-count'],
    queryFn: () => getVenues({ limit: 1 }),
  });
  const venueCount = venuesData?.data?.total || 0;

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteEvent(id),
    onSuccess: () => {
      toast.success('Event removed / cancelled');
      queryClient.invalidateQueries({ queryKey: ['org-events'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove event');
    },
  });

  const publishedCount = events.filter((e) => e.status === 'published').length;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Dashboard Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              Organizer Portal
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-1">
              Welcome back, {user?.name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your company events, schedules, venues, and attendee registrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/venues"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Venues ({venueCount})
            </Link>
            <Link
              to="/dashboard/events/new"
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow"
            >
              <FiPlus /> Create Event
            </Link>
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Sign out"
            >
              <FiLogOut className="text-lg" />
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{events.length}</p>
            </div>
            <div className="rounded-full bg-primary-50 p-3 text-primary-600">
              <FiCalendar className="text-2xl" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Published / Live</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
            </div>
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
              <FiEye className="text-2xl" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Venues</p>
              <p className="text-3xl font-bold text-indigo-600 mt-1">{venueCount}</p>
            </div>
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
              <FiMapPin className="text-2xl" />
            </div>
          </div>
        </div>

        {/* Events Management Section */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b border-gray-100 gap-4">
            <h2 className="text-lg font-bold text-gray-900">Your Organization Events</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">No events yet for your organization</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                You are currently logged in as <strong>{user?.name}</strong>. Create an event below to start scheduling sessions, or log into the account that created existing events.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/dashboard/events/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow-sm transition"
                >
                  <FiPlus /> + Create Event
                </Link>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Explore Public Events
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-3.5">Event</th>
                    <th className="px-6 py-3.5">Dates (UTC)</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Capacity</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {events.map((event) => (
                    <tr key={event._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{event.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="capitalize">{event.type}</span>
                          {event.isVirtual ? (
                            <span className="text-emerald-600 font-medium">Virtual</span>
                          ) : (
                            <span>{event.venue?.name || 'Venue TBA'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {new Date(event.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            event.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : event.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                        {event.capacity} max
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 text-gray-500">
                          <Link
                            to={`/dashboard/events/${event._id}/sessions`}
                            className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition border border-primary-200"
                            title="Manage Schedule & Speakers"
                          >
                            <FiClock className="text-primary-600" /> Schedule
                          </Link>
                          <Link
                            to={`/dashboard/events/${event._id}/attendees`}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                            title="Manage Attendees & Check-In"
                          >
                            <FiUsers /> Attendees
                          </Link>
                          <Link
                            to={`/dashboard/events/${event._id}/sponsors`}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition border border-amber-200"
                            title="Manage Sponsors & Booths"
                          >
                            <FiAward className="text-amber-600" /> Sponsors
                          </Link>
                          <Link
                            to={`/dashboard/events/${event._id}/analytics`}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200"
                            title="View Analytics & Reports"
                          >
                            <FiBarChart2 className="text-emerald-600" /> Analytics
                          </Link>
                          {event.status === 'published' && (
                            <Link
                              to={`/events/${event.slug}`}
                              className="p-1 hover:text-primary-600 text-gray-400 hover:bg-gray-100 rounded"
                              title="View Public Page"
                            >
                              <FiExternalLink />
                            </Link>
                          )}
                          <Link
                            to={`/dashboard/events/${event._id}/edit`}
                            className="p-1 hover:text-primary-600 text-gray-400 hover:bg-gray-100 rounded"
                            title="Edit Event"
                          >
                            <FiEdit />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Remove/cancel "${event.title}"?`)) {
                                deleteMutation.mutate(event._id);
                              }
                            }}
                            className="p-1 hover:text-red-600 text-gray-400 hover:bg-red-50 rounded"
                            title="Delete / Cancel"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
