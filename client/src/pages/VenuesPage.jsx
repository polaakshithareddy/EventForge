import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVenues, createVenue, deleteVenue } from '../api/venues';
import toast from 'react-hot-toast';
import { FiPlus, FiMapPin, FiUsers, FiTrash2, FiX } from 'react-icons/fi';

export default function VenuesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Venue Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
    capacity: 100,
    amenities: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['org-venues'],
    queryFn: () => getVenues({ limit: 50 }),
  });
  const venues = data?.data?.venues || [];

  const createMutation = useMutation({
    mutationFn: (payload) => createVenue(payload),
    onSuccess: () => {
      toast.success('Venue added successfully!');
      queryClient.invalidateQueries({ queryKey: ['org-venues'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        address: { street: '', city: '', state: '', country: '', postalCode: '' },
        capacity: 100,
        amenities: '',
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create venue');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteVenue(id),
    onSuccess: () => {
      toast.success('Venue deleted');
      queryClient.invalidateQueries({ queryKey: ['org-venues'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete venue');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.city.trim() || !formData.address.country.trim()) {
      toast.error('Name, City, and Country are required');
      return;
    }

    createMutation.mutate({
      ...formData,
      capacity: Number(formData.capacity),
      amenities: formData.amenities
        ? formData.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Venue Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage physical locations, conference halls, and spaces for your events.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow"
          >
            <FiPlus /> Add Venue
          </button>
        </div>

        {/* Venues Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <FiMapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-base font-semibold text-gray-900">No venues added yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first venue to host in-person sessions and conferences.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <FiPlus /> Add Venue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <div
                key={venue._id}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{venue.name}</h3>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${venue.name}?`)) {
                          deleteMutation.mutate(venue._id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete Venue"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  {venue.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{venue.description}</p>
                  )}

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-primary-600 flex-shrink-0" />
                      <span>
                        {[venue.address?.city, venue.address?.state, venue.address?.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiUsers className="text-primary-600 flex-shrink-0" />
                      <span>Max Capacity: {venue.capacity} attendees</span>
                    </div>
                  </div>

                  {venue.amenities?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {venue.amenities.map((item, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Venue */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Venue</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Grand Ballroom, Hall 4, etc."
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, country: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amenities (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    placeholder="Projector, WiFi, Stage, AV Sound System"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 shadow"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Venue'}
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
