import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { recommendSessions } from '../api/ai';
import useAuthStore from '../store/authStore';
import {
  FiZap,
  FiX,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiUser,
  FiCalendar,
  FiShare2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SUGGESTED_INTERESTS = [
  'Artificial Intelligence',
  'Cloud Architecture',
  'Cybersecurity',
  'Product Strategy',
  'Engineering Leadership',
  'DevOps & Scale',
  'Data & Analytics',
];

export default function AiScheduleRecommenderModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}) {
  const { user } = useAuthStore();
  const [selectedInterests, setSelectedInterests] = useState(
    user?.interests?.length > 0 ? user.interests : ['Artificial Intelligence']
  );
  const [customInterest, setCustomInterest] = useState('');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [recommendations, setRecommendations] = useState(null);

  const recommendMutation = useMutation({
    mutationFn: () =>
      recommendSessions({
        eventId,
        interests: selectedInterests,
        jobTitle,
      }),
    onSuccess: (res) => {
      const recs =
        res.data?.recommendations ||
        res.recommendations ||
        res.data?.data?.recommendations ||
        [];
      setRecommendations(recs);
      toast.success('Your personalized AI itinerary is ready!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate recommendations');
    },
  });

  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const addCustomInterest = (e) => {
    e.preventDefault();
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests([...selectedInterests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
              <FiZap />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Smart Schedule Matcher
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                  AI Powered
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Personalized session recommendations for <strong>{eventTitle}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <FiX />
          </button>
        </div>

        {/* Input Form (If not generated yet or for tweaking) */}
        <div className="rounded-xl bg-gray-50/80 p-4 border border-gray-200 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Select Your Core Topics & Interests:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-2.5 py-1 font-medium transition ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Professional Role / Job Title:
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Lead Engineer, Product Manager"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Add Custom Topic:
              </label>
              <form onSubmit={addCustomInterest} className="flex gap-1.5">
                <input
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="e.g. LLMOps"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-300 transition"
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => recommendMutation.mutate()}
              disabled={recommendMutation.isPending || selectedInterests.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-700 transition disabled:opacity-50"
            >
              <FiZap /> {recommendMutation.isPending ? 'Generating Itinerary...' : 'Build My AI Itinerary'}
            </button>
          </div>
        </div>

        {/* Results List */}
        {recommendations !== null && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Recommended Itinerary ({recommendations.length} Sessions)
              </h4>
              <span className="text-[11px] text-gray-400">Sorted by relevance</span>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center italic">
                No matching sessions found for this event.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map(({ session, matchScore, matchReason }) => (
                  <div
                    key={session._id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:border-primary-300 transition space-y-2 text-xs"
                  >
                    {/* Header: Track + Match Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                          style={{
                            backgroundColor: session.track?.color || '#4f46e5',
                          }}
                        >
                          {session.track?.name || 'General'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          <FiMapPin className="text-gray-400" /> {session.room}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 text-[11px] border border-emerald-200">
                        <FiCheckCircle /> {matchScore}% Match
                      </div>
                    </div>

                    {/* Title */}
                    <h5 className="text-sm font-bold text-gray-900 leading-snug">
                      {session.title}
                    </h5>

                    {/* AI Match Reason Banner */}
                    <p className="text-[11px] text-primary-800 bg-primary-50/70 p-2 rounded-lg border border-primary-100 italic">
                      💡 {matchReason}
                    </p>

                    {/* Time & Speakers */}
                    <div className="flex flex-wrap items-center justify-between text-gray-500 pt-1 text-[11px]">
                      <span className="flex items-center gap-1 text-primary-700 font-semibold">
                        <FiClock /> {formatTime(session.startTime)} - {formatTime(session.endTime)} UTC
                      </span>

                      {session.speakers?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FiUser className="text-gray-400" />
                          {session.speakers.map((s) => s.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
