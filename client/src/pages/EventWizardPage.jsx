import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createEvent, updateEvent, getEvent } from '../api/events';
import { getVenues } from '../api/venues';
import { generateEventCopy } from '../api/ai';
import toast from 'react-hot-toast';
import {
  FiCheck,
  FiCalendar,
  FiMapPin,
  FiDollarSign,
  FiEye,
  FiPlus,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';

const STEPS = [
  { id: 1, name: 'Basics', icon: FiEye },
  { id: 2, name: 'Date & Location', icon: FiCalendar },
  { id: 3, name: 'Tickets & Capacity', icon: FiDollarSign },
  { id: 4, name: 'Review & Publish', icon: FiCheck },
];

export default function EventWizardPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'conference',
    status: 'draft',
    startDate: '',
    endDate: '',
    timezone: 'UTC',
    isVirtual: false,
    virtualLink: '',
    venue: '',
    capacity: 100,
    tags: '',
    isPublic: true,
    ticketTypes: [{ name: 'General Admission', price: 0, quantity: 100, description: '' }],
  });

  // Fetch Venues for selection dropdown
  const { data: venuesData } = useQuery({
    queryKey: ['org-venues'],
    queryFn: () => getVenues({ limit: 100 }),
  });
  const venues = venuesData?.data?.venues || [];

  // Fetch Event details if edit mode
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event-detail', id],
    queryFn: () => getEvent(id),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (eventData?.data?.event) {
      const ev = eventData.data.event;
      setFormData({
        title: ev.title || '',
        description: ev.description || '',
        type: ev.type || 'conference',
        status: ev.status || 'draft',
        startDate: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 16) : '',
        endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 16) : '',
        timezone: ev.timezone || 'UTC',
        isVirtual: Boolean(ev.isVirtual),
        virtualLink: ev.virtualLink || '',
        venue: ev.venue?._id || ev.venue || '',
        capacity: ev.capacity || 100,
        tags: ev.tags?.join(', ') || '',
        isPublic: ev.isPublic !== undefined ? ev.isPublic : true,
        ticketTypes:
          ev.ticketTypes?.length > 0
            ? ev.ticketTypes
            : [{ name: 'General Admission', price: 0, quantity: 100, description: '' }],
      });
    }
  }, [eventData]);

  // Mutation for Create / Update
  const mutation = useMutation({
    mutationFn: (payload) => (isEditMode ? updateEvent(id, payload) : createEvent(payload)),
    onSuccess: (res) => {
      toast.success(isEditMode ? 'Event updated successfully!' : 'Event created successfully!');
      const eventSlug = res?.data?.event?.slug;
      if (eventSlug && res?.data?.event?.status === 'published') {
        navigate(`/events/${eventSlug}`);
      } else {
        navigate('/dashboard');
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save event';
      toast.error(msg);
    },
  });

  const [isGeneratingAiCopy, setIsGeneratingAiCopy] = useState(false);

  const handleAiGenerateCopy = async () => {
    if (!formData.title || formData.title.trim().length < 3) {
      toast.error('Please enter an event title first so AI can craft relevant copy');
      return;
    }
    setIsGeneratingAiCopy(true);
    try {
      const res = await generateEventCopy({
        title: formData.title,
        type: formData.type,
        topics: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : undefined,
      });
      const copyData = res.data?.description ? res.data : (res.data?.data || res);
      if (copyData) {
        setFormData((prev) => ({
          ...prev,
          description: copyData.description || prev.description,
          tags: prev.tags ? prev.tags : (copyData.suggestedTags || []).join(', '),
        }));
        toast.success('AI drafted marketing description and suggested tags!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI copy');
    } finally {
      setIsGeneratingAiCopy(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTicketChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.ticketTypes];
      updated[index] = {
        ...updated[index],
        [field]: field === 'price' || field === 'quantity' ? Number(value) : value,
      };
      return { ...prev, ticketTypes: updated };
    });
  };

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [
        ...prev.ticketTypes,
        { name: 'VIP Pass', price: 99, quantity: 50, description: '' },
      ],
    }));
  };

  const removeTicketType = (index) => {
    if (formData.ticketTypes.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, i) => i !== index),
    }));
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim() || formData.title.length < 3) {
        toast.error('Title must be at least 3 characters');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.startDate || !formData.endDate) {
        toast.error('Both start date and end date are required');
        return false;
      }
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        toast.error('End date must be after start date');
        return false;
      }
      if (!formData.isVirtual && !formData.venue) {
        toast.error('Please select an in-person venue or enable Virtual event');
        return false;
      }
    } else if (currentStep === 3) {
      if (formData.capacity < 1) {
        toast.error('Capacity must be at least 1');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = (finalStatus = null) => {
    if (!validateStep()) return;

    const payload = {
      ...formData,
      status: finalStatus || formData.status,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      capacity: Number(formData.capacity),
      venue: formData.isVirtual ? null : formData.venue || null,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    mutation.mutate(payload);
  };

  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Wizard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isEditMode ? 'Edit Event' : 'Create a New Event'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up details, venue schedules, and ticket options for your upcoming event.
          </p>
        </div>

        {/* Step Navigation Indicator */}
        <div className="mb-8 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isPassed = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm transition ${
                      isPassed
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isPassed ? <FiCheck className="text-lg" /> : <Icon className="text-lg" />}
                  </div>
                  <span
                    className={`ml-3 hidden sm:inline text-sm font-semibold ${
                      isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.id < STEPS.length && (
                    <div className="hidden sm:block w-12 lg:w-20 h-0.5 bg-gray-200 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Form Card */}
        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Step 1: Event Basics</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700">Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Global AI & Cloud Summit 2026"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="conference">Conference</option>
                    <option value="workshop">Workshop</option>
                    <option value="exhibition">Exhibition</option>
                    <option value="corporate">Corporate</option>
                    <option value="webinar">Webinar</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Public Visibility</label>
                  <div className="mt-3 flex items-center gap-4">
                    <label className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2">Show on public discovery directory</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={handleAiGenerateCopy}
                    disabled={isGeneratingAiCopy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition disabled:opacity-50"
                  >
                    <FiZap className={isGeneratingAiCopy ? 'animate-spin' : ''} />
                    {isGeneratingAiCopy ? 'Drafting with AI...' : '✨ Auto-Fill with AI'}
                  </button>
                </div>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell attendees what to expect, who should attend, and highlights..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="AI, Innovation, Leadership, Engineering"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: DATE & LOCATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Step 2: Dates, Time & Location</h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center text-sm font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      name="isVirtual"
                      checked={formData.isVirtual}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2">This is a Virtual Online Event</span>
                  </label>
                </div>

                {formData.isVirtual ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Live Stream / Meeting Link</label>
                    <input
                      type="url"
                      name="virtualLink"
                      value={formData.virtualLink}
                      onChange={handleChange}
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">In-Person Venue *</label>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/venues')}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        + Add New Venue
                      </button>
                    </div>
                    <select
                      name="venue"
                      value={formData.venue}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select a saved venue...</option>
                      {venues.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.address?.city}, Capacity: {v.capacity})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">
                      Our system automatically ensures no overlapping bookings occur for this venue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: TICKETS & CAPACITY */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Step 3: Capacity & Ticket Tiers</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700">Overall Event Capacity *</label>
                <input
                  type="number"
                  name="capacity"
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">Ticket Packages</h3>
                  <button
                    type="button"
                    onClick={addTicketType}
                    className="flex items-center gap-1 rounded-md bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                  >
                    <FiPlus /> Add Ticket Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.ticketTypes.map((ticket, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4 bg-gray-50/50 flex flex-col md:flex-row items-start md:items-center gap-4"
                    >
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500">Tier Name</label>
                        <input
                          type="text"
                          value={ticket.name}
                          onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                          placeholder="General Admission, VIP..."
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>

                      <div className="w-full md:w-32">
                        <label className="block text-xs font-medium text-gray-500">Price ($ USD)</label>
                        <input
                          type="number"
                          min="0"
                          value={ticket.price}
                          onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>

                      <div className="w-full md:w-32">
                        <label className="block text-xs font-medium text-gray-500">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={ticket.quantity}
                          onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)}
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>

                      {formData.ticketTypes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicketType(index)}
                          className="mt-5 text-gray-400 hover:text-red-500"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & PUBLISH */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Step 4: Review Event Summary</h2>

              <div className="rounded-lg bg-gray-50 p-6 border border-gray-200 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{formData.title}</h3>
                  <span className="mt-1 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary-800">
                    {formData.type}
                  </span>
                </div>

                <p className="text-sm text-gray-600">
                  {formData.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-700 block">Dates:</span>
                    <span className="text-gray-600">
                      {new Date(formData.startDate).toUTCString()} to{' '}
                      {new Date(formData.endDate).toUTCString()}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 block">Format:</span>
                    <span className="text-gray-600">
                      {formData.isVirtual ? 'Virtual Event' : 'In-Person Venue Event'}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 block">Capacity:</span>
                    <span className="text-gray-600">{formData.capacity} attendees</span>
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 block">Ticket Options:</span>
                    <span className="text-gray-600">
                      {formData.ticketTypes.map((t) => `${t.name} ($${t.price})`).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Next Step
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmit('draft')}
                    disabled={mutation.isPending}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit('published')}
                    disabled={mutation.isPending}
                    className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow"
                  >
                    {mutation.isPending ? 'Publishing...' : 'Publish Event'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
