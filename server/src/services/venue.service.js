import { Venue } from '../models/Venue.js';
import { Event } from '../models/Event.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';

export const createVenue = async (orgId, venueData) => {
  const venue = await Venue.create({
    ...venueData,
    organization: orgId,
  });
  return venue;
};

export const getVenues = async (orgId, query = {}) => {
  const { page = 1, limit = 20, search, city, isActive } = query;
  const filter = { organization: orgId };

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }

  if (city) {
    filter['address.city'] = new RegExp(city, 'i');
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { 'address.city': new RegExp(search, 'i') },
      { 'address.state': new RegExp(search, 'i') },
      { 'address.country': new RegExp(search, 'i') },
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [venues, total] = await Promise.all([
    Venue.find(filter).sort({ name: 1 }).skip(skip).limit(parsedLimit),
    Venue.countDocuments(filter),
  ]);

  return {
    venues,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const getVenueById = async (orgId, venueId) => {
  const venue = await Venue.findOne({ _id: venueId, organization: orgId });
  if (!venue) {
    throw new NotFoundError('Venue');
  }
  return venue;
};

export const updateVenue = async (orgId, venueId, updateData) => {
  const venue = await Venue.findOneAndUpdate(
    { _id: venueId, organization: orgId },
    updateData,
    { new: true, runValidators: true }
  );
  if (!venue) {
    throw new NotFoundError('Venue');
  }
  return venue;
};

export const deleteVenue = async (orgId, venueId) => {
  const venue = await Venue.findOne({ _id: venueId, organization: orgId });
  if (!venue) {
    throw new NotFoundError('Venue');
  }

  // Check if any upcoming or active events use this venue
  const activeEventsCount = await Event.countDocuments({
    venue: venueId,
    status: { $in: ['draft', 'published'] },
  });

  if (activeEventsCount > 0) {
    throw new ConflictError(
      `Cannot delete venue: it is assigned to ${activeEventsCount} active or draft event(s). Deactivate it or reassign events first.`
    );
  }

  await Venue.findByIdAndDelete(venueId);
  return { message: 'Venue deleted successfully' };
};
