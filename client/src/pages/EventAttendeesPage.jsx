import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventRegistrations, markAsPaid, checkInAttendee } from '../api/registrations';
import { getEvent } from '../api/events';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiCheckCircle,
  FiDollarSign,
  FiSearch,
  FiCheck,
  FiArrowLeft,
  FiClock,
} from 'react-icons/fi';

export default function EventAttendeesPage() {
  const { id: eventId } = useParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [checkedInFilter, setCheckedInFilter] = useState('');
  const [ticketInput, setTicketInput] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);

  // Fetch Event details
  const { data: eventData } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEvent(eventId),
  });
  const event = eventData?.data?.event;

  // Fetch Registrations and Revenue Summary
  const { data: registrationsData, isLoading } = useQuery({
    queryKey: ['event-registrations', eventId, { search, paymentFilter, checkedInFilter }],
    queryFn: () =>
      getEventRegistrations(eventId, {
        search,
        paymentStatus: paymentFilter,
        checkedIn: checkedInFilter,
        limit: 100,
      }),
  });

  const registrations = registrationsData?.data?.registrations || [];
  const summary = registrationsData?.data?.summary || {
    total: 0,
    paid: 0,
    unpaid: 0,
    free: 0,
    checkedIn: 0,
    revenue: 0,
  };

  // Mark as Paid Mutation (User-approved change #1)
  const payMutation = useMutation({
    mutationFn: (regId) => markAsPaid(regId),
    onSuccess: () => {
      toast.success('Registration marked as PAID');
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update payment status');
    },
  });

  // Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: (code) => checkInAttendee(eventId, code),
    onSuccess: (res) => {
      toast.success('Attendee checked in successfully!');
      setCheckInResult({ success: true, message: res.message });
      setTicketInput('');
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Check-in failed';
      toast.error(msg);
      setCheckInResult({ success: false, message: msg });
    },
  });

  const handleLiveCheckIn = (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }
    checkInMutation.mutate(ticketInput);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 mb-2"
          >
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Attendees & Check-In
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {event ? event.title : 'Event Attendees'}
              </p>
            </div>
            {event && (
              <span className="mt-2 sm:mt-0 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 capitalize">
                Capacity: {event.registrationCount || 0} / {event.capacity}
              </span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5 mb-8">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <span className="text-xs font-medium text-gray-500">Total Registered</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <span className="text-xs font-medium text-emerald-600">Checked In</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.checkedIn}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <span className="text-xs font-medium text-blue-600">Paid Passes</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary.paid}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <span className="text-xs font-medium text-amber-600">Unpaid Passes</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.unpaid}</p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 col-span-2 sm:col-span-1">
            <span className="text-xs font-medium text-gray-500">Total Revenue</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">${summary.revenue || 0}</p>
          </div>
        </div>

        {/* Live Check-In Console Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Live Attendee Check-In</h2>
          <p className="text-xs text-gray-500 mb-4">
            Scan QR code payload or type the ticket code (e.g., <code>EF-XXXXX-YYYY</code>) to verify and check in guests instantly.
          </p>

          <form onSubmit={handleLiveCheckIn} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Scan or enter Ticket Code / QR Payload..."
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 px-4 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={checkInMutation.isPending}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow disabled:opacity-50"
            >
              {checkInMutation.isPending ? 'Verifying...' : 'Check In Guest'}
            </button>
          </form>

          {checkInResult && (
            <div
              className={`mt-4 rounded-lg p-3 text-sm flex items-center justify-between ${
                checkInResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {checkInResult.success ? (
                  <FiCheck className="text-emerald-600 text-lg flex-shrink-0" />
                ) : (
                  <FiClock className="text-red-600 text-lg flex-shrink-0" />
                )}
                <span>{checkInResult.message}</span>
              </div>
              <button
                onClick={() => setCheckInResult(null)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Attendee Roster Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs font-medium text-gray-700 focus:outline-none"
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="free">Free</option>
              </select>

              <select
                value={checkedInFilter}
                onChange={(e) => setCheckedInFilter(e.target.value)}
                className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs font-medium text-gray-700 focus:outline-none"
              >
                <option value="">All Check-in</option>
                <option value="true">Checked In</option>
                <option value="false">Not Checked In</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FiUsers className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm font-medium">No attendees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-3.5">Attendee</th>
                    <th className="px-6 py-3.5">Tier & Price</th>
                    <th className="px-6 py-3.5">Ticket Code</th>
                    <th className="px-6 py-3.5">Payment</th>
                    <th className="px-6 py-3.5">Check-In</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {registrations.map((reg) => (
                    <tr key={reg._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {reg.user?.name || 'Attendee'}
                        </div>
                        <div className="text-xs text-gray-500">{reg.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                        <span className="font-semibold">{reg.ticketType?.name}</span>
                        <span className="text-gray-400 block">${reg.ticketType?.price}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-gray-800">
                        {reg.ticketCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                            reg.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : reg.paymentStatus === 'free'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {reg.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {reg.checkedIn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <FiCheckCircle /> Checked In
                          </span>
                        ) : (
                          <span className="text-gray-400">Not Checked In</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          {/* User-approved change #1: Organizer mark as paid action */}
                          {reg.paymentStatus === 'unpaid' && (
                            <button
                              onClick={() => payMutation.mutate(reg._id)}
                              disabled={payMutation.isPending}
                              className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                            >
                              Mark as Paid
                            </button>
                          )}

                          {!reg.checkedIn && (
                            <button
                              onClick={() => checkInMutation.mutate(reg.ticketCode)}
                              disabled={checkInMutation.isPending}
                              className="rounded bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition"
                            >
                              Check In
                            </button>
                          )}
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
