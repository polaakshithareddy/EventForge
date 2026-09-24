import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEventAnalytics, downloadAttendeeCSV, getBadgeData } from '../api/analytics';
import {
  FiArrowLeft,
  FiDownload,
  FiPrinter,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiPieChart,
  FiClock,
  FiAward,
  FiX,
  FiExternalLink,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EventAnalyticsPage() {
  const { id: eventId } = useParams();
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  // Analytics query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['event-analytics', eventId],
    queryFn: () => getEventAnalytics(eventId),
  });

  // Badges query (enabled when modal opens)
  const { data: badgeData, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['event-badges', eventId],
    queryFn: () => getBadgeData(eventId),
    enabled: isBadgeModalOpen,
  });

  const analytics = data?.data;
  const event = analytics?.event;
  const metrics = analytics?.metrics;
  const tierBreakdown = analytics?.tierBreakdown || [];
  const checkinTimeline = analytics?.checkinTimeline || [];

  // Handle CSV Download
  const handleExportCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      toast.loading('Generating attendee CSV export...', { id: 'csv-dl' });
      const res = await downloadAttendeeCSV(eventId);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${(event?.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attendees.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Attendee roster exported successfully!', { id: 'csv-dl' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export CSV', { id: 'csv-dl' });
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const handlePrintBadges = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="mx-auto max-w-3xl py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Unavailable</h2>
        <p className="mt-2 text-gray-600">Could not retrieve analytics data for this event.</p>
        <Link to="/dashboard" className="mt-6 inline-block btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:p-0">
      {/* SCREEN VIEW (Hidden when printing) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 print:hidden">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 transition"
          >
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to={`/dashboard/events/${eventId}/attendees`}
              className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
            >
              <FiUsers /> View Attendee List
            </Link>
            <span className="text-gray-300">•</span>
            <Link
              to={`/dashboard/events/${eventId}/sessions`}
              className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
            >
              <FiClock /> Schedule Studio
            </Link>
          </div>
        </div>

        {/* Hero Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Real-Time Analytics & Reporting
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {new Date(event.startDate).toLocaleDateString()}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {event.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Registration conversion, ticket revenue, attendance velocity, and export tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={isDownloadingCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 border border-gray-300 shadow-2xs hover:bg-gray-50 transition disabled:opacity-50"
            >
              <FiDownload className="text-primary-600" /> Export Attendee CSV
            </button>
            <button
              onClick={() => setIsBadgeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition"
            >
              <FiPrinter /> Print Attendee Badges
            </button>
          </div>
        </div>

        {/* Core KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Ticket Sales Revenue
              </span>
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                <FiDollarSign className="text-xl" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-gray-900">
                ${metrics.totalRevenue.toLocaleString()}
              </span>
              <p className="mt-1 text-xs text-gray-500">
                From {metrics.paymentBreakdown.paid} paid attendee(s)
              </p>
            </div>
          </div>

          {/* Registrations & Capacity */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Capacity Utilization
              </span>
              <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600">
                <FiUsers className="text-xl" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-gray-900">
                  {metrics.capacityUtilization}%
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {metrics.confirmedRegistrations} / {event.capacity} max
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.capacityUtilization)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Check-In Rate */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Attendance Check-In
              </span>
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                <FiCheckCircle className="text-xl" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-indigo-700">
                  {metrics.checkinRate}%
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {metrics.checkedInCount} checked-in
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.checkinRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Program Overview */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Program & Partners
              </span>
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
                <FiActivity className="text-xl" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-center pt-1">
              <div>
                <span className="text-xl font-bold text-gray-900 block">
                  {metrics.sessionsCount}
                </span>
                <span className="text-[11px] text-gray-500">Sessions</span>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div>
                <span className="text-xl font-bold text-gray-900 block">
                  {metrics.speakersCount}
                </span>
                <span className="text-[11px] text-gray-500">Speakers</span>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div>
                <span className="text-xl font-bold text-gray-900 block">
                  {metrics.sponsorsCount}
                </span>
                <span className="text-[11px] text-gray-500">Sponsors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections: Ticket Tiers & Payment Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Tier Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiBarChart2 className="text-primary-600" /> Ticket Tier Sales & Revenue
              </h3>
              <span className="text-xs text-gray-500">{tierBreakdown.length} tiers</span>
            </div>

            {tierBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center italic">
                No tickets purchased yet.
              </p>
            ) : (
              <div className="space-y-4">
                {tierBreakdown.map((tier) => {
                  const percentOfTotal =
                    metrics.confirmedRegistrations > 0
                      ? Math.round((tier.count / metrics.confirmedRegistrations) * 100)
                      : 0;
                  return (
                    <div key={tier.tierName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">{tier.tierName}</span>
                        <div className="space-x-3 text-right">
                          <span className="font-semibold text-gray-700">
                            {tier.count} tickets ({percentOfTotal}%)
                          </span>
                          <span className="font-extrabold text-emerald-600">
                            ${tier.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-600"
                          style={{ width: `${percentOfTotal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Status Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiPieChart className="text-indigo-600" /> Payment Lifecycle Status
              </h3>
              <span className="text-xs text-gray-500">
                {metrics.totalRegistrations} total pass(es)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Paid Passes
                </span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  {metrics.paymentBreakdown.paid}
                </span>
                <span className="text-[11px] text-emerald-600">Revenue verified</span>
              </div>

              <div className="rounded-xl bg-sky-50/70 p-4 border border-sky-100">
                <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider block">
                  Free / Complimentary
                </span>
                <span className="text-2xl font-bold text-sky-700 mt-1 block">
                  {metrics.paymentBreakdown.free}
                </span>
                <span className="text-[11px] text-sky-600">$0 tier tickets</span>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-100">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                  Unpaid (Pending)
                </span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">
                  {metrics.paymentBreakdown.unpaid}
                </span>
                <span className="text-[11px] text-amber-600">Awaiting organizer mark</span>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                  Refunded / Void
                </span>
                <span className="text-2xl font-bold text-gray-700 mt-1 block">
                  {metrics.paymentBreakdown.refunded}
                </span>
                <span className="text-[11px] text-gray-500">Cancelled passes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Check-In Velocity Timeline */}
        {checkinTimeline.length > 0 && (
          <div className="rounded-xl bg-white p-6 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiClock className="text-primary-600" /> Hourly Check-in Arrival Velocity
              </h3>
              <span className="text-xs text-gray-500">
                {metrics.checkedInCount} checked in
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {checkinTimeline.map((item) => (
                <div
                  key={item.timestamp}
                  className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-center"
                >
                  <span className="text-xs text-gray-500 block">{item.timestamp}</span>
                  <span className="text-base font-extrabold text-primary-700">
                    +{item.count} arrivals
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BADGE PRINTING MODAL / PRINT SHEET */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:static print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:max-w-none print:p-0">
            {/* Modal Screen Header (Hidden when printing) */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Attendee Badge Printing Studio
                </h3>
                <p className="text-xs text-gray-500">
                  Formatted for standard credential cards and badge sheets ({badgeData?.data?.totalBadges || 0} badges).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintBadges}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-700 transition"
                >
                  <FiPrinter /> Print Sheet
                </button>
                <button
                  onClick={() => setIsBadgeModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Badges Grid (Print-Ready) */}
            {isLoadingBadges ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : badgeData?.data?.badges?.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500 italic">
                No confirmed attendees registered yet to print badges.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
                {badgeData?.data?.badges?.map((badge) => (
                  <div
                    key={badge.registrationId}
                    className="flex flex-col justify-between rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 shadow-xs print:border-solid print:border-gray-800 print:shadow-none print:break-inside-avoid"
                  >
                    <div>
                      {/* Badge Top Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-primary-600">
                          EVENTFORGE • PASS
                        </span>
                        <span className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-800 uppercase tracking-wider">
                          {badge.ticketTier}
                        </span>
                      </div>

                      {/* Attendee Details */}
                      <div className="mt-4 space-y-1">
                        <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                          {badge.name}
                        </h2>
                        {(badge.jobTitle || badge.company) && (
                          <p className="text-xs text-gray-600 font-medium">
                            {[badge.jobTitle, badge.company].filter(Boolean).join(' • ')}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400">{badge.email}</p>
                      </div>
                    </div>

                    {/* Badge Bottom: QR & Event Info */}
                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                          Conference
                        </span>
                        <span className="text-xs font-bold text-gray-800 line-clamp-1 max-w-[200px]">
                          {badgeData.data.event.title}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-primary-600 block mt-0.5">
                          {badge.ticketCode}
                        </span>
                      </div>

                      {badge.qrCodeDataUrl && (
                        <img
                          src={badge.qrCodeDataUrl}
                          alt={badge.ticketCode}
                          className="h-16 w-16 rounded border border-gray-200 p-1"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
