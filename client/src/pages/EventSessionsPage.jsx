import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEventSessions,
  createSession,
  deleteSession,
  getEventSpeakers,
  inviteSpeaker,
} from '../api/sessions';
import { getEvent } from '../api/events';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiPlus,
  FiUser,
  FiTrash2,
  FiX,
  FiArrowLeft,
  FiTag,
  FiMail,
  FiZap,
  FiCheckCircle,
} from 'react-icons/fi';
import { generateAgenda, polishSpeakerBio } from '../api/ai';

const TRACK_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function EventSessionsPage() {
  const { id: eventId } = useParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('sessions');
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);

  // New Session Form State
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    track: { name: 'Main Track', color: '#6366f1' },
    room: 'Main Auditorium',
    startTime: '',
    endTime: '',
    speakers: [],
    tags: '',
  });

  // Speaker Invite Form State
  const [speakerForm, setSpeakerForm] = useState({
    name: '',
    email: '',
    company: '',
    jobTitle: '',
    bio: '',
    speakerTopics: '',
  });

  // AI Agenda Builder State
  const [isAiAgendaModalOpen, setIsAiAgendaModalOpen] = useState(false);
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState(false);
  const [isApplyingAgenda, setIsApplyingAgenda] = useState(false);
  const [agendaParams, setAgendaParams] = useState({
    tracksCount: 2,
    sessionsPerTrack: 3,
    topics: '',
    audience: '',
  });
  const [generatedAgenda, setGeneratedAgenda] = useState(null);

  // AI Speaker Bio Polishing State
  const [isPolishingBio, setIsPolishingBio] = useState(false);

  // Fetch Event details
  const { data: eventData } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEvent(eventId),
  });
  const event = eventData?.data?.event;

  // Fetch Sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['event-sessions', eventId],
    queryFn: () => getEventSessions(eventId),
  });
  const sessions = sessionsData?.data?.sessions || [];

  // Fetch Speakers
  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: ['event-speakers', eventId],
    queryFn: () => getEventSpeakers(eventId),
  });
  const speakers = speakersData?.data?.speakers || [];

  // Create Session Mutation
  const sessionMutation = useMutation({
    mutationFn: (payload) => createSession(eventId, payload),
    onSuccess: () => {
      toast.success('Session scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['event-sessions', eventId] });
      setIsSessionModalOpen(false);
      setSessionForm({
        title: '',
        description: '',
        track: { name: 'Main Track', color: '#6366f1' },
        room: 'Main Auditorium',
        startTime: '',
        endTime: '',
        speakers: [],
        tags: '',
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create session');
    },
  });

  // Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId) => deleteSession(sessionId),
    onSuccess: () => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['event-sessions', eventId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete session');
    },
  });

  // Invite Speaker Mutation
  const speakerMutation = useMutation({
    mutationFn: (payload) => inviteSpeaker(eventId, payload),
    onSuccess: () => {
      toast.success('Speaker invitation sent!');
      queryClient.invalidateQueries({ queryKey: ['event-speakers', eventId] });
      setIsSpeakerModalOpen(false);
      setSpeakerForm({
        name: '',
        email: '',
        company: '',
        jobTitle: '',
        bio: '',
        speakerTopics: '',
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to invite speaker');
    },
  });

  const handleSessionSubmit = (e) => {
    e.preventDefault();
    if (!sessionForm.title.trim() || !sessionForm.startTime || !sessionForm.endTime) {
      toast.error('Title, Start Time, and End Time are required');
      return;
    }

    if (new Date(sessionForm.startTime) >= new Date(sessionForm.endTime)) {
      toast.error('End time must be after start time');
      return;
    }

    sessionMutation.mutate({
      ...sessionForm,
      startTime: new Date(sessionForm.startTime).toISOString(),
      endTime: new Date(sessionForm.endTime).toISOString(),
      tags: sessionForm.tags
        ? sessionForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    });
  };

  const handleSpeakerSubmit = (e) => {
    e.preventDefault();
    if (!speakerForm.name.trim() || !speakerForm.email.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    speakerMutation.mutate({
      ...speakerForm,
      speakerTopics: speakerForm.speakerTopics
        ? speakerForm.speakerTopics.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    });
  };

  const handleGenerateAgenda = async () => {
    if (!event?.title) {
      toast.error('Event details not loaded yet');
      return;
    }
    setIsGeneratingAgenda(true);
    try {
      const res = await generateAgenda({
        eventTitle: event.title,
        tracksCount: Number(agendaParams.tracksCount),
        sessionsPerTrack: Number(agendaParams.sessionsPerTrack),
        topics: agendaParams.topics || (event.tags ? event.tags.join(', ') : undefined),
        audience: agendaParams.audience || undefined,
      });
      setGeneratedAgenda(res.data?.sessions ? res.data : (res.data?.data || res));
      toast.success('AI successfully structured your agenda!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate agenda');
    } finally {
      setIsGeneratingAgenda(false);
    }
  };

  const handleApplyAgenda = async () => {
    if (!generatedAgenda?.sessions?.length) return;
    setIsApplyingAgenda(true);

    try {
      const baseDate = event?.startDate ? new Date(event.startDate) : new Date(Date.now() + 86400000);
      const year = baseDate.getUTCFullYear();
      const month = baseDate.getUTCMonth();
      const day = baseDate.getUTCDate();

      const trackIndices = {};
      let successCount = 0;

      for (const sess of generatedAgenda.sessions) {
        const trackName = sess.trackName || 'General';
        const sessionIdxInTrack = trackIndices[trackName] || 0;
        trackIndices[trackName] = sessionIdxInTrack + 1;

        const startMinutes = 9 * 60 + sessionIdxInTrack * 90;
        const start = new Date(Date.UTC(year, month, day, 0, startMinutes, 0));
        const end = new Date(start.getTime() + (sess.durationMinutes || 60) * 60000);

        try {
          await createSession(eventId, {
            title: sess.title,
            description: sess.description,
            track: { name: sess.trackName, color: sess.trackColor || '#6366f1' },
            room: sess.room,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            tags: sess.tags || [],
          });
          successCount++;
        } catch (sessErr) {
          console.warn('Skipping conflicting/failed session:', sess.title, sessErr.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['event-sessions', eventId] });
      toast.success(`Successfully scheduled ${successCount} AI sessions!`);
      setIsAiAgendaModalOpen(false);
      setGeneratedAgenda(null);
    } catch (err) {
      toast.error('Failed to schedule some sessions');
    } finally {
      setIsApplyingAgenda(false);
    }
  };

  const handleAiPolishSpeakerBio = async () => {
    if (!speakerForm.name?.trim()) {
      toast.error('Please enter the speaker name first');
      return;
    }
    setIsPolishingBio(true);
    try {
      const res = await polishSpeakerBio({
        name: speakerForm.name,
        company: speakerForm.company || '',
        jobTitle: speakerForm.jobTitle || '',
        rawBio: speakerForm.bio?.trim() || 'Speaker at leading tech conferences.',
        speakerTopics: speakerForm.speakerTopics
          ? speakerForm.speakerTopics.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
      });
      const data = res.data?.polishedBio ? res.data : (res.data?.data || res);
      if (data?.polishedBio) {
        setSpeakerForm((prev) => ({
          ...prev,
          bio: data.polishedBio,
        }));
        toast.success('Speaker bio enhanced with AI!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to polish bio');
    } finally {
      setIsPolishingBio(false);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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
                Schedule & Speaker Studio
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {event ? event.title : 'Event Scheduling'}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (event?.tags?.length) {
                    setAgendaParams((p) => ({ ...p, topics: event.tags.join(', ') }));
                  }
                  setIsAiAgendaModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700 shadow-xs transition"
              >
                <FiZap /> AI Agenda Builder
              </button>
              <button
                onClick={() => setIsSpeakerModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <FiMail /> Invite Speaker
              </button>
              <button
                onClick={() => setIsSessionModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow-xs"
              >
                <FiPlus /> Add Session
              </button>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                activeTab === 'sessions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sessions & Agenda ({sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('speakers')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm ${
                activeTab === 'speakers'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Distinguished Speakers ({speakers.length})
            </button>
          </nav>
        </div>

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div>
            {isLoadingSessions ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-3 text-base font-semibold text-gray-900">No sessions scheduled yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Build your event agenda with keynotes, multi-track workshops, and panels.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (event?.tags?.length) {
                        setAgendaParams((p) => ({ ...p, topics: event.tags.join(', ') }));
                      }
                      setIsAiAgendaModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700 shadow-xs"
                  >
                    <FiZap /> Build Agenda with AI
                  </button>
                  <button
                    onClick={() => setIsSessionModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs"
                  >
                    <FiPlus /> Add First Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: session.track?.color || '#4f46e5' }}
                        >
                          {session.track?.name || 'General'}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          <FiMapPin className="text-gray-400" /> {session.room}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary-700">
                          <FiClock className="text-primary-500" />
                          {formatDate(session.startTime)} | {formatTime(session.startTime)} -{' '}
                          {formatTime(session.endTime)} (UTC)
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{session.description}</p>
                      )}

                      {/* Assigned Speakers */}
                      {session.speakers?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs text-gray-400 font-medium">Speakers:</span>
                          {session.speakers.map((sp) => (
                            <span
                              key={sp._id}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full"
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

                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                      <button
                        onClick={() => {
                          if (confirm(`Delete session "${session.title}"?`)) {
                            deleteSessionMutation.mutate(session._id);
                          }
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Session"
                      >
                        <FiTrash2 className="text-lg" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SPEAKERS TAB */}
        {activeTab === 'speakers' && (
          <div>
            {isLoadingSpeakers ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            ) : speakers.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
                <FiUser className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-3 text-base font-semibold text-gray-900">No speakers invited yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Invite industry leaders and presenters to showcase in your agenda.
                </p>
                <button
                  onClick={() => setIsSpeakerModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow"
                >
                  <FiMail /> Invite Speaker
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {speakers.map((sp) => (
                  <div
                    key={sp._id}
                    className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                          {sp.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900">{sp.name}</h4>
                          <p className="text-xs text-gray-500">
                            {[sp.jobTitle, sp.company].filter(Boolean).join(' at ') || sp.email}
                          </p>
                        </div>
                      </div>

                      {sp.bio && (
                        <p className="mt-4 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                          {sp.bio}
                        </p>
                      )}

                      {sp.speakerTopics?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {sp.speakerTopics.map((topic, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                      <span>{sp.sessions?.length || 0} scheduled sessions</span>
                      <span className="text-emerald-600 font-semibold">Active Speaker</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD SESSION */}
        {isSessionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Add Session to Schedule</h2>
              <p className="text-xs text-gray-500 mb-5">
                Our engine automatically checks for room double-booking and speaker schedule conflicts.
              </p>

              <form onSubmit={handleSessionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session Title *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    placeholder="e.g., Keynote: Generative AI in Production"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Track Name</label>
                    <input
                      type="text"
                      value={sessionForm.track.name}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          track: { ...sessionForm.track, name: e.target.value },
                        })
                      }
                      placeholder="e.g., Tech Track, AI, Main Stage"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Track Color</label>
                    <div className="mt-1 flex items-center gap-2">
                      {TRACK_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            setSessionForm({
                              ...sessionForm,
                              track: { ...sessionForm.track, color },
                            })
                          }
                          className={`h-7 w-7 rounded-full border-2 transition ${
                            sessionForm.track.color === color
                              ? 'border-gray-900 scale-110 shadow-sm'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Room / Hall *</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.room}
                    onChange={(e) => setSessionForm({ ...sessionForm, room: e.target.value })}
                    placeholder="Main Auditorium, Workshop Hall 2..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Time (UTC) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={sessionForm.startTime}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, startTime: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Time (UTC) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={sessionForm.endTime}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, endTime: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Speaker Selector */}
                {speakers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign Speaker(s)
                    </label>
                    <select
                      multiple
                      value={sessionForm.speakers}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setSessionForm({ ...sessionForm, speakers: selected });
                      }}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm h-24"
                    >
                      {speakers.map((sp) => (
                        <option key={sp._id} value={sp._id}>
                          {sp.name} ({sp.company || sp.email})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-gray-400">
                      Hold Ctrl (or Cmd) to select multiple speakers
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    value={sessionForm.description}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, description: e.target.value })
                    }
                    placeholder="Key highlights and topics covered..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sessionMutation.isPending}
                    className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow disabled:opacity-50"
                  >
                    {sessionMutation.isPending ? 'Verifying & Saving...' : 'Save Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: INVITE SPEAKER */}
        {isSpeakerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsSpeakerModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Invite Distinguished Speaker</h2>
              <p className="text-xs text-gray-500 mb-5">
                Sends an email invitation stub allowing the speaker to link their account and edit their profile.
              </p>

              <form onSubmit={handleSpeakerSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Speaker Name *</label>
                  <input
                    type="text"
                    required
                    value={speakerForm.name}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, name: e.target.value })}
                    placeholder="Dr. Evelyn Brooks"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Speaker Email *</label>
                  <input
                    type="email"
                    required
                    value={speakerForm.email}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, email: e.target.value })}
                    placeholder="evelyn.brooks@university.edu"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company / Org</label>
                    <input
                      type="text"
                      value={speakerForm.company}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, company: e.target.value })}
                      placeholder="OpenTech Labs"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Title</label>
                    <input
                      type="text"
                      value={speakerForm.jobTitle}
                      onChange={(e) => setSpeakerForm({ ...speakerForm, jobTitle: e.target.value })}
                      placeholder="VP of Research"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Topics (comma-separated)</label>
                  <input
                    type="text"
                    value={speakerForm.speakerTopics}
                    onChange={(e) =>
                      setSpeakerForm({ ...speakerForm, speakerTopics: e.target.value })
                    }
                    placeholder="Quantum Computing, Agentic Workflows, AI Ethics"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Biography</label>
                    <button
                      type="button"
                      onClick={handleAiPolishSpeakerBio}
                      disabled={isPolishingBio}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition disabled:opacity-50"
                    >
                      <FiZap className={isPolishingBio ? 'animate-spin' : ''} />
                      {isPolishingBio ? 'Polishing...' : '✨ Polish with AI'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={speakerForm.bio}
                    onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })}
                    placeholder="Short professional bio..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsSpeakerModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={speakerMutation.isPending}
                    className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 shadow disabled:opacity-50"
                  >
                    {speakerMutation.isPending ? 'Sending Invite...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: AI AGENDA BUILDER */}
        {isAiAgendaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setIsAiAgendaModalOpen(false);
                  setGeneratedAgenda(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-2xl" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-xs">
                  <FiZap className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">AI Multi-Track Agenda Builder</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Automatically generate cohesive multi-track session schedules, talk descriptions, and room allocations using EventForge AI.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Tracks Count</label>
                    <select
                      value={agendaParams.tracksCount}
                      onChange={(e) =>
                        setAgendaParams((p) => ({ ...p, tracksCount: Number(e.target.value) }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      <option value={1}>1 Track (Single Stage)</option>
                      <option value={2}>2 Tracks (Dual Stage)</option>
                      <option value={3}>3 Tracks (Multi-Track)</option>
                      <option value={4}>4 Tracks (Enterprise Summit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Sessions per Track</label>
                    <select
                      value={agendaParams.sessionsPerTrack}
                      onChange={(e) =>
                        setAgendaParams((p) => ({ ...p, sessionsPerTrack: Number(e.target.value) }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      <option value={2}>2 Sessions</option>
                      <option value={3}>3 Sessions</option>
                      <option value={4}>4 Sessions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Topics / Focus Themes (comma-separated)</label>
                  <input
                    type="text"
                    value={agendaParams.topics}
                    onChange={(e) => setAgendaParams((p) => ({ ...p, topics: e.target.value }))}
                    placeholder="e.g. Distributed Systems, Generative AI, Cloud Security, Product Growth"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Target Audience (optional)</label>
                  <input
                    type="text"
                    value={agendaParams.audience}
                    onChange={(e) => setAgendaParams((p) => ({ ...p, audience: e.target.value }))}
                    placeholder="e.g. Senior Software Engineers, VP of Technology, Solutions Architects"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateAgenda}
                    disabled={isGeneratingAgenda}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-primary-700 hover:to-indigo-700 transition disabled:opacity-50"
                  >
                    <FiZap className={isGeneratingAgenda ? 'animate-spin' : ''} />
                    {isGeneratingAgenda ? 'Constructing Multi-Track Agenda...' : 'Generate Structured Agenda with AI'}
                  </button>
                </div>

                {/* Generated Agenda Preview */}
                {generatedAgenda && (
                  <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          Proposed Agenda ({generatedAgenda.totalSessions} Sessions)
                        </h3>
                        <p className="text-xs text-gray-500">
                          Review structured sessions and add them to your live event schedule.
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {generatedAgenda.tracks?.map((t) => (
                          <span
                            key={t.name}
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: t.color }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                      {generatedAgenda.sessions?.map((sess, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-bold rounded px-1.5 py-0.5 text-[10px] text-white"
                              style={{ backgroundColor: sess.trackColor }}
                            >
                              {sess.trackName}
                            </span>
                            <span className="text-gray-500">{sess.room} ({sess.durationMinutes} min)</span>
                          </div>
                          <h4 className="font-semibold text-gray-900">{sess.title}</h4>
                          <p className="text-gray-600 line-clamp-2">{sess.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setGeneratedAgenda(null)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAgenda}
                        disabled={isApplyingAgenda}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        <FiCheckCircle className={isApplyingAgenda ? 'animate-spin' : ''} />
                        {isApplyingAgenda ? 'Scheduling All Sessions...' : `Confirm & Schedule All (${generatedAgenda.totalSessions})`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
