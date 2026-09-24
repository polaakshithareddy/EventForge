import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getPublicEvent } from '../api/events';
import { registerForEvent } from '../api/registrations';
import { getEventSchedule, getEventSpeakers } from '../api/sessions';
import { getPublicSponsorsByTier } from '../api/sponsors';
import useAuthStore from '../store/authStore';
import {
  FiCalendar,
  FiMapPin,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiVideo,
  FiTag,
  FiShare2,
  FiX,
  FiCheck,
  FiUsers,
  FiEdit,
  FiPlus,
  FiAward,
  FiGlobe,
  FiExternalLink,
  FiBarChart2,
  FiZap,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import AiScheduleRecommenderModal from '../components/AiScheduleRecommenderModal';

export default function PublicEventDetailPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'schedule', 'speakers', 'sponsors', 'venue'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [isAiRecommenderOpen, setIsAiRecommenderOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-event', slug],
    queryFn: () => getPublicEvent(slug),
  });
  const event = data?.data?.event;

  // Multi-track schedule query
  const { data: scheduleData } = useQuery({
    queryKey: ['event-schedule', event?._id],
    queryFn: () => getEventSchedule(event._id),
    enabled: Boolean(event?._id),
  });
  const schedule = scheduleData?.data || { days: [], tracks: [] };

  // Speakers query
  const { data: speakersData } = useQuery({
    queryKey: ['event-speakers-public', event?._id],
    queryFn: () => getEventSpeakers(event._id),
    enabled: Boolean(event?._id),
  });
  const speakers = speakersData?.data?.speakers || [];

  // Sponsors query
  const { data: sponsorsData } = useQuery({
    queryKey: ['event-sponsors-public', event?._id],
    queryFn: () => getPublicSponsorsByTier(event._id),
    enabled: Boolean(event?._id),
  });
  const sponsorTiers = sponsorsData?.data?.tiers || {
    platinum: [],
    gold: [],
    silver: [],
    bronze: [],
    partner: [],
  };
  const totalSponsors = sponsorsData?.data?.total || 0;

  const registrationMutation = useMutation({
    mutationFn: (payload) => registerForEvent(payload),
    onSuccess: (res) => {
      toast.success('Registration confirmed! Your pass is ready.');
      setConfirmedTicket(res.data.registration);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to complete registration');
    },
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Event link copied to clipboard!');
  };

  const handleOpenRegister = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/events/${slug}`);
      return;
    }

    if (event?.ticketTypes?.length > 0) {
      setSelectedTicket(event.ticketTypes[0].name);
    } else {
      setSelectedTicket('General Admission');
    }
    setConfirmedTicket(null);
    setIsModalOpen(true);
  };

  const handleConfirmRegister = (e) => {
    e.preventDefault();
    if (!selectedTicket) {
      toast.error('Please select a ticket tier');
      return;
    }

    registrationMutation.mutate({
      eventId: event._id,
      ticketTypeName: selectedTicket,
      notes,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="mx-auto max-w-3xl py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Event Not Found</h2>
        <p className="mt-2 text-gray-600">The event you are looking for does not exist or has been removed.</p>
        <Link to="/events" className="mt-6 inline-block btn-primary">
          Back to Events
        </Link>
      </div>
    );
  }

  const currentDay = schedule.days?.[selectedDayIndex] || schedule.days?.[0];

  const isOrganizer =
    isAuthenticated &&
    event &&
    (user?.role === 'superadmin' ||
      (user?.organization &&
        (user.organization === event.organization?._id ||
          user.organization === event.organization ||
          user.organization?._id === event.organization?._id)));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Organizer Quick Bar */}
      {isOrganizer && (
        <div className="bg-primary-950 text-white border-b border-primary-800 py-3 px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">Organizer Mode</span>
              <span className="text-primary-300 text-xs hidden sm:inline">— You manage this event</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/dashboard/events/${event._id}/sessions`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 hover:bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition"
              >
                <FiClock /> Manage Schedule & Speakers
              </Link>
              <Link
                to={`/dashboard/events/${event._id}/attendees`}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <FiUsers /> Attendees & Check-in
              </Link>
              <Link
                to={`/dashboard/events/${event._id}/sponsors`}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <FiAward /> Sponsors & Booths
              </Link>
              <Link
                to={`/dashboard/events/${event._id}/analytics`}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <FiBarChart2 /> Analytics & Reports
              </Link>
              <Link
                to={`/dashboard/events/${event._id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition"
              >
                <FiEdit /> Edit Event
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Event Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-primary-950 to-indigo-950 text-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-600/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                {event.type}
              </span>
              {event.isVirtual && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-semibold">
                  <FiVideo /> Virtual
                </span>
              )}
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition backdrop-blur-sm"
            >
              <FiShare2 /> Share
            </button>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl max-w-4xl">
            {event.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-primary-400" />
              <span>{formatDate(event.startDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock className="text-primary-400" />
              <span>
                {formatTime(event.startDate)} - {formatTime(event.endDate)} (UTC)
              </span>
            </div>
            {!event.isVirtual && event.venue && (
              <div className="flex items-center gap-2">
                <FiMapPin className="text-primary-400" />
                <span>
                  {event.venue.name}, {event.venue.address?.city}
                </span>
              </div>
            )}
            {event.organization && (
              <div className="flex items-center gap-2">
                <FiUser className="text-primary-400" />
                <span>Organized by {event.organization.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                    activeTab === 'overview'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                    activeTab === 'schedule'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Schedule ({schedule.totalSessions || 0})
                </button>
                <button
                  onClick={() => setActiveTab('speakers')}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                    activeTab === 'speakers'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Speakers ({speakers.length})
                </button>
                <button
                  onClick={() => setActiveTab('sponsors')}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                    activeTab === 'sponsors'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sponsors ({totalSponsors})
                </button>
                {!event.isVirtual && event.venue && (
                  <button
                    onClick={() => setActiveTab('venue')}
                    className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                      activeTab === 'venue'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Venue Info
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">About this event</h3>
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {event.description || 'No detailed description provided for this event.'}
                      </p>
                    </div>

                    {event.tags?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Topics & Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                            >
                              <FiTag className="text-[10px]" /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SCHEDULE TAB */}
                {activeTab === 'schedule' && (
                  <div className="space-y-6">
                    {/* AI Recommendation Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50 via-indigo-50/70 to-purple-50 p-4 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-xs">
                          <FiZap className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-950">
                            AI Personalized Schedule Recommender
                          </h4>
                          <p className="mt-0.5 text-xs text-gray-600 max-w-xl">
                            Tell our AI your role, focus areas, and goals to curate a personalized multi-track conference itinerary tailored to your profile.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAiRecommenderOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-700 transition"
                      >
                        <FiZap className="h-3.5 w-3.5" />
                        Curate My Schedule
                      </button>
                    </div>

                    {/* Day Selector */}
                    {schedule.days?.length > 1 && (
                      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
                        {schedule.days.map((day, idx) => (
                          <button
                            key={day.date}
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                              selectedDayIndex === idx
                                ? 'bg-primary-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Day {idx + 1} ({day.formattedDate})
                          </button>
                        ))}
                      </div>
                    )}

                    {!currentDay || currentDay.sessions.length === 0 ? (
                      <div className="py-12 text-center bg-gray-50/80 rounded-xl border border-dashed border-gray-200 p-6">
                        <FiClock className="mx-auto h-9 w-9 text-gray-400" />
                        <h4 className="mt-2 text-sm font-semibold text-gray-900">No sessions scheduled yet</h4>
                        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                          Detailed session schedule for this date will be announced soon.
                        </p>
                        {isOrganizer && (
                          <Link
                            to={`/dashboard/events/${event._id}/sessions`}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-700 transition"
                          >
                            <FiPlus /> Open Schedule & Speaker Studio
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentDay.sessions.map((session) => (
                          <div
                            key={session._id}
                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-xs"
                                  style={{
                                    backgroundColor: session.track?.color || '#4f46e5',
                                  }}
                                >
                                  {session.track?.name || 'General'}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                                  <FiMapPin className="text-gray-400" /> {session.room}
                                </span>
                              </div>

                              <span className="text-xs font-semibold text-primary-700">
                                {formatTime(session.startTime)} - {formatTime(session.endTime)} UTC
                              </span>
                            </div>

                            <h4 className="mt-2.5 text-base font-bold text-gray-900">
                              {session.title}
                            </h4>
                            {session.description && (
                              <p className="mt-1 text-sm text-gray-600">{session.description}</p>
                            )}

                            {session.speakers?.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-400">Speakers:</span>
                                {session.speakers.map((sp) => (
                                  <span
                                    key={sp._id}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 bg-primary-50 px-2.5 py-0.5 rounded-full"
                                  >
                                    <FiUser className="text-primary-600" /> {sp.name}
                                    {sp.company && (
                                      <span className="text-gray-400">({sp.company})</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SPEAKERS TAB */}
                {activeTab === 'speakers' && (
                  <div>
                    {speakers.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">
                        Keynote speakers will be announced shortly.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {speakers.map((sp) => (
                          <div
                            key={sp._id}
                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                                  {sp.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <h4 className="text-base font-bold text-gray-900">{sp.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {[sp.jobTitle, sp.company].filter(Boolean).join(' at ')}
                                  </p>
                                </div>
                              </div>

                              {sp.bio && (
                                <p className="mt-3 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                                  {sp.bio}
                                </p>
                              )}

                              {sp.speakerTopics?.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {sp.speakerTopics.map((topic, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                    >
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {sp.sessions?.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                <span className="font-semibold text-gray-700 block mb-1">
                                  Presenting:
                                </span>
                                {sp.sessions.map((sess) => (
                                  <span
                                    key={sess._id}
                                    className="block text-primary-600 font-medium truncate"
                                  >
                                    • {sess.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SPONSORS TAB */}
                {activeTab === 'sponsors' && (
                  <div className="space-y-8">
                    {totalSponsors === 0 ? (
                      <div className="py-12 text-center bg-gray-50/80 rounded-xl border border-dashed border-gray-200 p-6">
                        <FiAward className="mx-auto h-10 w-10 text-gray-400" />
                        <h4 className="mt-2 text-sm font-semibold text-gray-900">
                          Sponsors & Partners Directory
                        </h4>
                        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                          Official corporate sponsors and exhibition partners for this summit will be announced shortly.
                        </p>
                        {isOrganizer && (
                          <Link
                            to={`/dashboard/events/${event._id}/sponsors`}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-700 transition"
                          >
                            <FiPlus /> Manage Sponsors & Booths
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Platinum Tier */}
                        {sponsorTiers.platinum?.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                              <span className="rounded-md bg-indigo-950 px-2.5 py-0.5 text-xs font-extrabold text-white uppercase tracking-wider">
                                Platinum Partners
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sponsorTiers.platinum.map((sp) => (
                                <div
                                  key={sp._id}
                                  className="rounded-xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/30 to-white p-5 shadow-sm space-y-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {sp.logoUrl ? (
                                        <img
                                          src={sp.logoUrl}
                                          alt={sp.name}
                                          className="h-12 w-12 rounded-lg object-contain bg-white border border-indigo-100 p-1"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-900 text-white font-bold text-lg">
                                          {sp.name.charAt(0)}
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="text-base font-bold text-gray-900">{sp.name}</h4>
                                        {sp.boothNumber && (
                                          <span className="inline-flex items-center gap-1 text-xs text-indigo-700 font-semibold">
                                            <FiMapPin /> {sp.boothNumber}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {sp.websiteUrl && (
                                      <a
                                        href={sp.websiteUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-2xs"
                                      >
                                        <FiGlobe /> Visit <FiExternalLink className="text-[10px]" />
                                      </a>
                                    )}
                                  </div>
                                  {sp.description && (
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {sp.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gold Tier */}
                        {sponsorTiers.gold?.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                              <span className="rounded-md bg-amber-500 px-2.5 py-0.5 text-xs font-extrabold text-white uppercase tracking-wider">
                                Gold Sponsors
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {sponsorTiers.gold.map((sp) => (
                                <div
                                  key={sp._id}
                                  className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs space-y-2 hover:shadow-xs transition"
                                >
                                  <div className="flex items-center gap-2.5">
                                    {sp.logoUrl ? (
                                      <img
                                        src={sp.logoUrl}
                                        alt={sp.name}
                                        className="h-10 w-10 rounded-md object-contain bg-gray-50 border border-gray-100 p-1"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 text-amber-800 font-bold text-sm">
                                        {sp.name.charAt(0)}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-bold text-gray-900 truncate">
                                        {sp.name}
                                      </h4>
                                      {sp.boothNumber && (
                                        <span className="text-[11px] text-gray-500 block truncate">
                                          {sp.boothNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {sp.websiteUrl && (
                                    <a
                                      href={sp.websiteUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline pt-1"
                                    >
                                      <FiGlobe className="text-[10px]" /> Visit Website
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Silver & Bronze & Partners */}
                        {(sponsorTiers.silver?.length > 0 ||
                          sponsorTiers.bronze?.length > 0 ||
                          sponsorTiers.partner?.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                              <span className="rounded-md bg-slate-700 px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                                Exhibitors & Community Partners
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {[
                                ...(sponsorTiers.silver || []),
                                ...(sponsorTiers.bronze || []),
                                ...(sponsorTiers.partner || []),
                              ].map((sp) => (
                                <div
                                  key={sp._id}
                                  className="rounded-lg border border-gray-200 bg-white p-3 text-center space-y-1 hover:border-primary-200 transition"
                                >
                                  <div className="font-semibold text-xs text-gray-900 truncate">
                                    {sp.name}
                                  </div>
                                  {sp.boothNumber && (
                                    <div className="text-[10px] text-primary-600 font-medium">
                                      {sp.boothNumber}
                                    </div>
                                  )}
                                  {sp.websiteUrl && (
                                    <a
                                      href={sp.websiteUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-gray-500 hover:text-primary-600 inline-block"
                                    >
                                      Website ↗
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* VENUE TAB */}
                {activeTab === 'venue' && event.venue && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">{event.venue.name}</h3>
                    <p className="text-sm text-gray-600">{event.venue.description}</p>
                    <div className="rounded-lg bg-gray-50 p-4 border border-gray-100 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <FiMapPin className="text-primary-600" />
                        <span>
                          {[
                            event.venue.address?.street,
                            event.venue.address?.city,
                            event.venue.address?.state,
                            event.venue.address?.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUser className="text-primary-600" />
                        <span>Capacity: {event.venue.capacity} guests</span>
                      </div>
                    </div>

                    {event.venue.amenities?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          {event.venue.amenities.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <FiCheckCircle className="text-emerald-500" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tickets & Registration */}
          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tickets & Passes</h3>

              {event.ticketTypes?.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-lg font-bold text-gray-900">Free Admission</p>
                  <p className="text-xs text-gray-500 mt-1">General access registration</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {event.ticketTypes.map((ticket, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-200 p-3.5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{ticket.name}</div>
                        {ticket.description && (
                          <div className="text-xs text-gray-500">{ticket.description}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {ticket.quantity - (ticket.sold || 0)} tickets available
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">
                          {ticket.price === 0 ? 'Free' : `$${ticket.price}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenRegister}
                className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow transition"
              >
                Register for Event
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Instant confirmation. Passes delivered electronically with QR code.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FiX className="text-2xl" />
            </button>

            {!confirmedTicket ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Complete Your Registration</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select your ticket tier and confirm your registration for {event.title}.
                </p>

                <form onSubmit={handleConfirmRegister} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Choose Ticket Tier
                    </label>
                    <div className="space-y-2">
                      {(event.ticketTypes?.length > 0
                        ? event.ticketTypes
                        : [{ name: 'General Admission', price: 0 }]
                      ).map((tier, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                            selectedTicket === tier.name
                              ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="ticketTier"
                              value={tier.name}
                              checked={selectedTicket === tier.name}
                              onChange={(e) => setSelectedTicket(e.target.value)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <span className="font-semibold text-sm text-gray-900 block">
                                {tier.name}
                              </span>
                              {tier.description && (
                                <span className="text-xs text-gray-500">{tier.description}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-base font-bold text-gray-900">
                            {tier.price === 0 ? 'Free' : `$${tier.price}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Attendee Notes / Dietary Restrictions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special accommodations, questions..."
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={registrationMutation.isPending}
                      className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow disabled:opacity-50"
                    >
                      {registrationMutation.isPending ? 'Confirming...' : 'Confirm Registration'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* REGISTRATION SUCCESS PASS DISPLAY */
              <div className="text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <FiCheck className="text-2xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">You're Registered!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your electronic pass has been issued. Save or present your QR code at check-in.
                </p>

                {/* Digital Ticket Card */}
                <div className="mt-6 rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-5 shadow-inner text-left space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                        Official Ticket Pass
                      </span>
                      <h4 className="text-base font-bold text-gray-900">{event.title}</h4>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        confirmedTicket.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : confirmedTicket.paymentStatus === 'free'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {confirmedTicket.paymentStatus}
                    </span>
                  </div>

                  {/* QR Code Render */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <img
                      src={confirmedTicket.qrCode}
                      alt="Ticket QR Code"
                      className="h-44 w-44 rounded-lg border border-gray-200 p-2 bg-white shadow-sm"
                    />
                    <span className="font-mono text-xs font-bold tracking-widest text-gray-700 mt-2">
                      {confirmedTicket.ticketCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-800 block">Attendee:</span>
                      <span>{user?.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800 block">Tier:</span>
                      <span>{confirmedTicket.ticketType?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/my-tickets"
                    className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow"
                  >
                    View in My Tickets
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Schedule Recommender Modal */}
      {event && (
        <AiScheduleRecommenderModal
          isOpen={isAiRecommenderOpen}
          onClose={() => setIsAiRecommenderOpen(false)}
          eventId={event._id}
          eventTitle={event.title}
        />
      )}
    </div>
  );
}
