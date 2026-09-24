import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent } from '../api/events';
import {
  getPublicSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  inviteSponsorRepresentative,
  downloadSponsorContract,
} from '../api/sponsors';
import {
  FiArrowLeft,
  FiPlus,
  FiAward,
  FiExternalLink,
  FiDownload,
  FiUserPlus,
  FiEdit,
  FiTrash2,
  FiMapPin,
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiX,
  FiMail,
  FiGlobe,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const TIERS = [
  { value: 'platinum', label: 'Platinum', color: 'bg-indigo-900 text-white border-indigo-700' },
  { value: 'gold', label: 'Gold', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'silver', label: 'Silver', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { value: 'bronze', label: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'partner', label: 'Community Partner', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

export default function EventSponsorsPage() {
  const { id: eventId } = useParams();
  const queryClient = useQueryClient();

  const [selectedTierFilter, setSelectedTierFilter] = useState('all');
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedSponsorForInvite, setSelectedSponsorForInvite] = useState(null);

  // Form states for Sponsor
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorTier, setSponsorTier] = useState('silver');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [sponsorWebsite, setSponsorWebsite] = useState('');
  const [sponsorDescription, setSponsorDescription] = useState('');
  const [sponsorBooth, setSponsorBooth] = useState('');
  const [sponsorContactName, setSponsorContactName] = useState('');
  const [sponsorContactEmail, setSponsorContactEmail] = useState('');
  const [sponsorContractFile, setSponsorContractFile] = useState(null);

  // Form states for Representative Invite
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repCompany, setRepCompany] = useState('');

  // Fetch event details
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: () => getEvent(eventId),
  });
  const event = eventData?.data?.event;

  // Fetch sponsors
  const { data: sponsorsData, isLoading: isLoadingSponsors } = useQuery({
    queryKey: ['event-sponsors', eventId],
    queryFn: () => getPublicSponsors(eventId),
  });
  const sponsors = sponsorsData?.data?.sponsors || [];

  // Filtered sponsors
  const filteredSponsors =
    selectedTierFilter === 'all'
      ? sponsors
      : sponsors.filter((s) => s.tier === selectedTierFilter);

  // Create / Update Mutation
  const saveSponsorMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('name', sponsorName);
      formData.append('tier', sponsorTier);
      if (sponsorLogo) formData.append('logoUrl', sponsorLogo);
      if (sponsorWebsite) formData.append('websiteUrl', sponsorWebsite);
      if (sponsorDescription) formData.append('description', sponsorDescription);
      if (sponsorBooth) formData.append('boothNumber', sponsorBooth);
      if (sponsorContactName) formData.append('contactName', sponsorContactName);
      if (sponsorContactEmail) formData.append('contactEmail', sponsorContactEmail);
      if (sponsorContractFile) formData.append('contract', sponsorContractFile);

      if (editingSponsor) {
        return updateSponsor(editingSponsor._id, formData);
      }
      return createSponsor(eventId, formData);
    },
    onSuccess: () => {
      toast.success(editingSponsor ? 'Sponsor updated!' : 'Sponsor registered!');
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] });
      closeSponsorModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save sponsor');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (sponsorId) => deleteSponsor(sponsorId),
    onSuccess: () => {
      toast.success('Sponsor removed');
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove sponsor');
    },
  });

  // Invite Representative Mutation
  const inviteMutation = useMutation({
    mutationFn: (payload) => inviteSponsorRepresentative(selectedSponsorForInvite._id, payload),
    onSuccess: () => {
      toast.success('Representative invitation sent via email stub!');
      queryClient.invalidateQueries({ queryKey: ['event-sponsors', eventId] });
      setIsInviteModalOpen(false);
      setRepName('');
      setRepEmail('');
      setRepCompany('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to invite representative');
    },
  });

  // Handle Contract Download
  const handleDownloadContract = async (sponsor) => {
    try {
      toast.loading('Fetching authenticated contract...', { id: 'contract-dl' });
      const res = await downloadSponsorContract(sponsor._id);
      const blob = new Blob([res.data], {
        type: sponsor.contractDocument?.mimeType || 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        sponsor.contractDocument?.originalName || `${sponsor.name}-contract.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Contract downloaded successfully', { id: 'contract-dl' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not download contract', {
        id: 'contract-dl',
      });
    }
  };

  const openAddModal = () => {
    setEditingSponsor(null);
    setSponsorName('');
    setSponsorTier('silver');
    setSponsorLogo('');
    setSponsorWebsite('');
    setSponsorDescription('');
    setSponsorBooth('');
    setSponsorContactName('');
    setSponsorContactEmail('');
    setSponsorContractFile(null);
    setIsSponsorModalOpen(true);
  };

  const openEditModal = (sponsor) => {
    setEditingSponsor(sponsor);
    setSponsorName(sponsor.name);
    setSponsorTier(sponsor.tier);
    setSponsorLogo(sponsor.logoUrl || '');
    setSponsorWebsite(sponsor.websiteUrl || '');
    setSponsorDescription(sponsor.description || '');
    setSponsorBooth(sponsor.boothNumber || '');
    setSponsorContactName(sponsor.contactName || '');
    setSponsorContactEmail(sponsor.contactEmail || '');
    setSponsorContractFile(null);
    setIsSponsorModalOpen(true);
  };

  const closeSponsorModal = () => {
    setIsSponsorModalOpen(false);
    setEditingSponsor(null);
    setSponsorContractFile(null);
  };

  const openInviteModal = (sponsor) => {
    setSelectedSponsorForInvite(sponsor);
    setRepName('');
    setRepEmail(sponsor.contactEmail || '');
    setRepCompany(sponsor.name);
    setIsInviteModalOpen(true);
  };

  // Stats
  const platinumCount = sponsors.filter((s) => s.tier === 'platinum').length;
  const goldCount = sponsors.filter((s) => s.tier === 'gold').length;
  const boothsAllocated = sponsors.filter((s) => s.boothNumber).length;

  if (isLoadingEvent) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-600 transition"
          >
            <FiArrowLeft /> Back to Dashboard
          </Link>
          {event?.slug && (
            <Link
              to={`/events/${event.slug}?tab=sponsors`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              <FiExternalLink /> View Public Sponsor Showcase
            </Link>
          )}
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700 uppercase tracking-wider">
                Exhibitor & Sponsor Hub
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{event?.title}</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Sponsors, Partners & Exhibition Booths
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage corporate partnerships, exhibition floor assignments, contract agreements, and booth reps.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition flex-shrink-0"
          >
            <FiPlus /> + Add Sponsor / Exhibitor
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <span className="text-xs font-medium text-gray-500">Total Partners</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">{sponsors.length}</span>
              <FiAward className="text-primary-500 text-xl" />
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <span className="text-xs font-medium text-gray-500">Platinum Sponsors</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-indigo-700">{platinumCount}</span>
              <span className="text-xs rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 font-semibold">Tier 1</span>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <span className="text-xs font-medium text-gray-500">Gold Sponsors</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-700">{goldCount}</span>
              <span className="text-xs rounded bg-amber-50 px-2 py-0.5 text-amber-700 font-semibold">Tier 2</span>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 border border-gray-100 shadow-xs">
            <span className="text-xs font-medium text-gray-500">Booths Allocated</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-700">{boothsAllocated}</span>
              <FiMapPin className="text-emerald-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Exhibition Floor / Booth Directory Preview */}
        {boothsAllocated > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <FiMapPin className="text-indigo-400" /> Exhibition Floor & Booth Stand Map
              </h3>
              <span className="text-xs text-indigo-200">
                {boothsAllocated} assigned booth(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {sponsors
                .filter((s) => s.boothNumber)
                .map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm border border-white/15"
                  >
                    <span className="font-bold text-amber-300">{s.boothNumber}</span>
                    <span className="text-white/80">•</span>
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="text-[10px] rounded bg-white/20 px-1.5 py-0.5 uppercase tracking-wide">
                      {s.tier}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tier Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTierFilter('all')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedTierFilter === 'all'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Tiers ({sponsors.length})
          </button>
          {TIERS.map((tier) => {
            const count = sponsors.filter((s) => s.tier === tier.value).length;
            return (
              <button
                key={tier.value}
                onClick={() => setSelectedTierFilter(tier.value)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedTierFilter === tier.value
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{tier.label}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sponsors Grid / List */}
        {isLoadingSponsors ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <FiAward className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">No sponsors in this category</h3>
            <p className="mt-1 text-sm text-gray-500">
              Click below to onboard your first corporate sponsor or exhibition partner.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-700"
            >
              <FiPlus /> Add Sponsor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredSponsors.map((sponsor) => {
              const tierBadge = TIERS.find((t) => t.value === sponsor.tier) || TIERS[2];
              return (
                <div
                  key={sponsor._id}
                  className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Header: Tier + Actions */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${tierBadge.color}`}
                      >
                        {sponsor.tier}
                      </span>
                      <div className="flex items-center gap-1 text-gray-400">
                        <button
                          onClick={() => openEditModal(sponsor)}
                          className="p-1 hover:text-primary-600 hover:bg-gray-100 rounded"
                          title="Edit Sponsor"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${sponsor.name}"?`)) {
                              deleteMutation.mutate(sponsor._id);
                            }
                          }}
                          className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Sponsor"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>

                    {/* Logo & Name */}
                    <div className="flex items-center gap-3">
                      {sponsor.logoUrl ? (
                        <img
                          src={sponsor.logoUrl}
                          alt={sponsor.name}
                          className="h-12 w-12 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-base font-extrabold text-primary-700 border border-primary-100">
                          {sponsor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-bold text-gray-900 leading-snug">
                          {sponsor.name}
                        </h4>
                        {sponsor.websiteUrl && (
                          <a
                            href={sponsor.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <FiGlobe /> Visit Website
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Booth Tag */}
                    {sponsor.boothNumber && (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                        <FiMapPin className="text-amber-600" />
                        <span>Booth: {sponsor.boothNumber}</span>
                      </div>
                    )}

                    {/* Description */}
                    {sponsor.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {sponsor.description}
                      </p>
                    )}

                    {/* Contact details */}
                    {(sponsor.contactName || sponsor.contactEmail) && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 border border-gray-100 space-y-0.5">
                        <span className="font-semibold text-gray-700 block">Primary Contact:</span>
                        {sponsor.contactName && <div>{sponsor.contactName}</div>}
                        {sponsor.contactEmail && (
                          <div className="flex items-center gap-1 text-primary-600">
                            <FiMail /> {sponsor.contactEmail}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Representatives */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <FiUsers /> Representatives ({sponsor.representatives?.length || 0})
                        </span>
                        <button
                          onClick={() => openInviteModal(sponsor)}
                          className="text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-0.5"
                        >
                          <FiUserPlus /> Invite
                        </button>
                      </div>
                      {sponsor.representatives?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sponsor.representatives.map((rep) => (
                            <span
                              key={rep._id}
                              className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
                            >
                              <FiCheckCircle className="text-emerald-500 text-[10px]" />
                              {rep.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">No booth representatives linked</p>
                      )}
                    </div>
                  </div>

                  {/* Contract Document (Authenticated File Serving) */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    {sponsor.contractDocument?.filename ? (
                      <button
                        onClick={() => handleDownloadContract(sponsor)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                        title="Download private sponsorship contract"
                      >
                        <FiDownload /> Contract Document
                      </button>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                        <FiFileText /> No contract attached
                      </span>
                    )}

                    <span className="text-[11px] text-gray-400">
                      Added {new Date(sponsor.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SPONSOR MODAL (Add / Edit) */}
        {isSponsorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingSponsor ? 'Edit Sponsor / Exhibitor' : 'Add Sponsor / Exhibitor'}
                </h3>
                <button
                  onClick={closeSponsorModal}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSponsorMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. Acme Corp Technologies"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Tier *</label>
                    <select
                      value={sponsorTier}
                      onChange={(e) => setSponsorTier(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      {TIERS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Booth / Stand No.</label>
                    <input
                      type="text"
                      value={sponsorBooth}
                      onChange={(e) => setSponsorBooth(e.target.value)}
                      placeholder="e.g. Booth A-102"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Logo Image URL</label>
                    <input
                      type="url"
                      value={sponsorLogo}
                      onChange={(e) => setSponsorLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Website URL</label>
                    <input
                      type="url"
                      value={sponsorWebsite}
                      onChange={(e) => setSponsorWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    value={sponsorDescription}
                    onChange={(e) => setSponsorDescription(e.target.value)}
                    placeholder="Brief description of products, services, or sponsorship mission..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Contact Person</label>
                    <input
                      type="text"
                      value={sponsorContactName}
                      onChange={(e) => setSponsorContactName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700">Contact Email</label>
                    <input
                      type="email"
                      value={sponsorContactEmail}
                      onChange={(e) => setSponsorContactEmail(e.target.value)}
                      placeholder="sponsor@company.com"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contract Upload (Authenticated Route) */}
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <label className="block text-xs font-bold text-gray-800">
                    Sponsorship Contract / Agreement Document
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Stored privately and served strictly through authenticated routes (PDF, DOCX, images up to 10MB).
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setSponsorContractFile(e.target.files[0] || null)}
                    className="w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {editingSponsor?.contractDocument?.filename && !sponsorContractFile && (
                    <p className="mt-1.5 text-[11px] text-emerald-700 flex items-center gap-1">
                      <FiCheckCircle /> Current file: {editingSponsor.contractDocument.originalName}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeSponsorModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveSponsorMutation.isPending}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saveSponsorMutation.isPending ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Save Sponsor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVITE REPRESENTATIVE MODAL */}
        {isInviteModalOpen && selectedSponsorForInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Invite Sponsor Representative</h3>
                  <p className="text-xs text-gray-500">
                    For <strong>{selectedSponsorForInvite.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate({
                    name: repName,
                    email: repEmail,
                    company: repCompany,
                  });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Representative Name *</label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700">Company Name</label>
                  <input
                    type="text"
                    value={repCompany}
                    onChange={(e) => setRepCompany(e.target.value)}
                    placeholder={selectedSponsorForInvite.name}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  ℹ️ This sends an activation email stub and grants event sponsor credentials.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
