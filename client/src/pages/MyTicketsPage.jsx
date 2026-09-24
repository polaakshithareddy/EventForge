import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyRegistrations, cancelRegistration } from '../api/registrations';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiMapPin,
  FiVideo,
  FiEye,
  FiTrash2,
  FiX,
  FiCheckCircle,
} from 'react-icons/fi';

export default function MyTicketsPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: getMyRegistrations,
  });

  const registrations = data?.data?.registrations || [];

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelRegistration(id),
    onSuccess: () => {
      toast.success('Registration cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setSelectedTicket(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel registration');
    },
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My Tickets & Passes</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your event registrations, electronic ticket passes, and check-in QR codes.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : registrations.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <FiCheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-base font-semibold text-gray-900">No active registrations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Browse public conferences and workshops to get your tickets.
            </p>
            <Link to="/events" className="mt-4 inline-block btn-primary text-sm">
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrations.map((reg) => {
              const event = reg.event;
              return (
                <div
                  key={reg._id}
                  className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                            reg.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : reg.paymentStatus === 'free'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {reg.paymentStatus}
                        </span>
                        {reg.checkedIn && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-xs font-medium">
                            <FiCheckCircle /> Checked In
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-gray-900 mt-2">
                          {event?.title || 'Event'}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="text-primary-600 flex-shrink-0" />
                        <span>{event?.startDate ? formatDate(event.startDate) : 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {event?.isVirtual ? (
                          <>
                            <FiVideo className="text-emerald-500 flex-shrink-0" />
                            <span>Virtual Live Stream</span>
                          </>
                        ) : (
                          <>
                            <FiMapPin className="text-primary-600 flex-shrink-0" />
                            <span>
                              {event?.venue?.name || 'In-Person Venue'},{' '}
                              {event?.venue?.address?.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>Tier: <strong className="text-gray-900">{reg.ticketType?.name}</strong></span>
                      <span>Code: <strong className="font-mono text-gray-900">{reg.ticketCode}</strong></span>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedTicket(reg)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700"
                    >
                      <FiEye /> View Pass & QR Code
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Cancel your registration for this event?')) {
                          cancelMutation.mutate(reg._id);
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <FiTrash2 /> Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Digital Pass / QR Code Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative text-center">
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>

              <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                Attendee Electronic Pass
              </span>
              <h3 className="text-lg font-bold text-gray-900 mt-1">
                {selectedTicket.event?.title}
              </h3>

              <div className="my-5 flex flex-col items-center justify-center">
                <img
                  src={selectedTicket.qrCode}
                  alt="Check-in QR Code"
                  className="h-52 w-52 rounded-xl border border-gray-200 p-2.5 bg-white shadow-sm"
                />
                <span className="mt-2.5 font-mono text-sm font-bold tracking-widest text-gray-800">
                  {selectedTicket.ticketCode}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Present this QR code to the event staff at entry
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 text-left text-xs space-y-1 text-gray-600 border border-gray-100 mb-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Ticket Tier:</span>
                  <span>{selectedTicket.ticketType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Payment Status:</span>
                  <span className="uppercase font-bold text-primary-700">
                    {selectedTicket.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-800">Check-in Status:</span>
                  <span>{selectedTicket.checkedIn ? 'Checked In' : 'Not Checked In'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
