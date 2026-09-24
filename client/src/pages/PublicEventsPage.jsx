import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPublicEvents } from '../api/events';
import { FiSearch, FiCalendar, FiMapPin, FiTag, FiVideo, FiClock } from 'react-icons/fi';

const EVENT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Conference', value: 'conference' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Exhibition', value: 'exhibition' },
  { label: 'Corporate', value: 'corporate' },
  { label: 'Webinar', value: 'webinar' },
];

export default function PublicEventsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-events', { search, type, city, page }],
    queryFn: () => getPublicEvents({ search, type, city, page, limit: 9 }),
  });

  const events = data?.data?.events || [];
  const totalPages = data?.data?.totalPages || 1;

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
        {/* Page Header */}
        <div className="text-center sm:text-left sm:flex sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Discover Upcoming Events
            </h1>
            <p className="mt-2 text-base text-gray-600">
              Browse world-class corporate summits, technical workshops, and industry conferences.
            </p>
          </div>
          <Link
            to="/register"
            className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm"
          >
            Host an Event
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow-sm md:grid-cols-4">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, topics..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FiMapPin className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by city..."
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setSearch('');
                setType('');
                setCity('');
                setPage(1);
              }}
              className="text-sm font-medium text-gray-500 hover:text-primary-600"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl bg-red-50 p-8 text-center text-red-600">
            Failed to load events. Please refresh or try again later.
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No events found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search criteria or filter options.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md border border-gray-100"
              >
                {/* Event Card Header */}
                <div className="h-44 w-full bg-gradient-to-r from-primary-700 to-indigo-800 p-5 flex flex-col justify-between text-white relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold capitalize backdrop-blur-sm">
                      {event.type}
                    </span>
                    {event.isVirtual ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                        <FiVideo /> Virtual
                      </span>
                    ) : event.venue ? (
                      <span className="inline-flex items-center gap-1 text-xs text-white/90">
                        <FiMapPin /> {event.venue.address?.city || 'In-Person'}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <FiCalendar className="mr-2 text-primary-600 flex-shrink-0" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {event.description || 'Join industry leaders and innovators for this exclusive session.'}
                    </p>

                    {event.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {event.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                          >
                            <FiTag className="mr-1 text-gray-400 text-[10px]" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <span className="text-xs text-gray-500 block">Tickets from</span>
                      <span className="text-base font-bold text-gray-900">
                        {event.ticketTypes?.length > 0
                          ? `$${Math.min(...event.ticketTypes.map((t) => t.price))}`
                          : 'Free'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/events/${event.slug}?tab=schedule`}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5"
                        title="View Event Schedule"
                      >
                        <FiClock className="text-primary-600 text-xs" /> Schedule
                      </Link>
                      <Link
                        to={`/events/${event.slug}`}
                        className="rounded-lg bg-primary-50 px-3.5 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
