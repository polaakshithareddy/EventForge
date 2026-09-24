import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { EventMembership } from '../models/EventMembership.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../utils/AppError.js';
import { sendEmail } from './email.service.js';

// Helper to ensure a unique slug
const generateUniqueSlug = async (title) => {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug || 'event';
  let counter = 1;

  while (await Event.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
};

// Ensure user has an organization
const resolveUserOrganization = async (user) => {
  if (user.organization) {
    const org = await Organization.findById(user.organization);
    if (org && org.isActive) return org;
  }

  // If user has no organization or org inactive, check if one exists for user or create personal org
  const orgName = `${user.name}'s Organization`;
  const slug = await (async () => {
    const base = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let s = base;
    let c = 1;
    while (await Organization.exists({ slug: s })) {
      s = `${base}-${c}`;
      c++;
    }
    return s;
  })();

  const newOrg = await Organization.create({
    name: orgName,
    slug,
    contact: { email: user.email },
  });

  await User.findByIdAndUpdate(user._id, { organization: newOrg._id });
  user.organization = newOrg._id;
  return newOrg;
};

// Check venue conflict in UTC (User-approved change #6)
const checkVenueConflict = async (venueId, startDate, endDate, excludeEventId = null) => {
  if (!venueId) return;

  const conflictQuery = {
    venue: venueId,
    status: { $in: ['draft', 'published'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  if (excludeEventId) {
    conflictQuery._id = { $ne: excludeEventId };
  }

  const conflictingEvent = await Event.findOne(conflictQuery);
  if (conflictingEvent) {
    throw new ConflictError(
      `Venue conflict: This venue is already booked for "${conflictingEvent.title}" from ${conflictingEvent.startDate.toISOString()} to ${conflictingEvent.endDate.toISOString()} UTC.`
    );
  }
};

export const createEvent = async (user, eventData) => {
  const org = await resolveUserOrganization(user);

  // 1. Enforce Organization subscription limits (User-approved change #5)
  const maxEvents = org.subscription?.limits?.maxEvents ?? 1;
  const currentEventCount = await Event.countDocuments({
    organization: org._id,
    status: { $ne: 'cancelled' },
  });

  if (currentEventCount >= maxEvents) {
    throw new ForbiddenError(
      `Organization event limit reached (max: ${maxEvents}). Please upgrade your subscription to create more events.`
    );
  }

  // 2. Validate UTC dates (User-approved change #6)
  const utcStartDate = new Date(eventData.startDate);
  const utcEndDate = new Date(eventData.endDate);

  if (isNaN(utcStartDate.getTime()) || isNaN(utcEndDate.getTime())) {
    throw new ValidationError([{ field: 'startDate', message: 'Invalid date format' }]);
  }

  if (utcStartDate >= utcEndDate) {
    throw new ValidationError([
      { field: 'endDate', message: 'End date must be after start date' },
    ]);
  }

  // 3. Verify venue ownership & availability
  if (eventData.venue) {
    const venue = await Venue.findOne({ _id: eventData.venue, organization: org._id });
    if (!venue) {
      throw new NotFoundError('Venue in your organization');
    }
    await checkVenueConflict(venue._id, utcStartDate, utcEndDate);
  }

  // 4. Generate unique slug
  const slug = await generateUniqueSlug(eventData.title);

  // 5. Create Event
  const event = await Event.create({
    ...eventData,
    slug,
    organization: org._id,
    startDate: utcStartDate,
    endDate: utcEndDate,
    registrationDeadline: eventData.registrationDeadline
      ? new Date(eventData.registrationDeadline)
      : undefined,
  });

  // 6. Assign creator as Event Organizer (User-approved change #3)
  await EventMembership.create({
    user: user._id,
    event: event._id,
    role: 'organizer',
  });

  return event.populate('venue');
};

export const getPublicEvents = async (query = {}) => {
  const {
    page = 1,
    limit = 12,
    search,
    type,
    city,
    startDateFrom,
    startDateTo,
    tags,
    sort = 'startDate',
  } = query;

  const filter = {
    status: 'published',
    isPublic: true,
  };

  if (type) {
    filter.type = type;
  }

  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    filter.tags = { $in: tagList };
  }

  if (startDateFrom || startDateTo) {
    filter.startDate = {};
    if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
    if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
  }

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') },
    ];
  }

  // If filtering by city, find venues in that city
  if (city) {
    const venues = await Venue.find({ 'address.city': new RegExp(city, 'i') }).select('_id');
    const venueIds = venues.map((v) => v._id);
    filter.venue = { $in: venueIds };
  }

  const sortOption = {};
  if (sort === 'startDate') sortOption.startDate = 1;
  else if (sort === '-startDate') sortOption.startDate = -1;
  else if (sort === 'title') sortOption.title = 1;
  else sortOption.createdAt = -1;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('venue')
      .populate('organization', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit),
    Event.countDocuments(filter),
  ]);

  return {
    events,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const getPublicEventBySlug = async (slugOrId) => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slugOrId);
  const filter = isObjectId ? { _id: slugOrId } : { slug: slugOrId.toLowerCase() };

  const event = await Event.findOne(filter)
    .populate('venue')
    .populate('organization', 'name slug')
    .populate('sessions.speakers', 'name avatar email');

  if (!event) {
    throw new NotFoundError('Event');
  }

  return event;
};

export const getOrgEvents = async (user, query = {}) => {
  const org = await resolveUserOrganization(user);
  const { page = 1, limit = 20, search, status, type } = query;

  const filter = { organization: org._id };

  if (status) filter.status = status;
  if (type) filter.type = type;

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { slug: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') },
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('venue')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Event.countDocuments(filter),
  ]);

  return {
    events,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const getEventById = async (eventId, user) => {
  const event = await Event.findById(eventId)
    .populate('venue')
    .populate('organization', 'name slug')
    .populate('sessions.speakers', 'name avatar email');

  if (!event) {
    throw new NotFoundError('Event');
  }

  // Check access: Admin or belongs to org or is a member
  if (user.globalRole !== 'admin') {
    const isOrgMember = user.organization && user.organization.equals(event.organization._id);
    const hasMembership = await EventMembership.exists({ user: user._id, event: eventId });

    if (!isOrgMember && !hasMembership && (!event.isPublic || event.status === 'draft')) {
      throw new ForbiddenError('You do not have access to this event');
    }
  }

  return event;
};

export const updateEvent = async (eventId, user, updateData) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }

  // Check permission: Global admin, or organizer via EventMembership, or org match
  if (user.globalRole !== 'admin') {
    const membership = await EventMembership.findOne({
      user: user._id,
      event: eventId,
      role: 'organizer',
    });
    const isOrgMatch = user.organization && user.organization.equals(event.organization);

    if (!membership && !isOrgMatch) {
      throw new ForbiddenError('Only event organizers can edit this event');
    }
  }

  // Handle UTC date updates & venue conflict check (User-approved change #6)
  const newStartDate = updateData.startDate ? new Date(updateData.startDate) : event.startDate;
  const newEndDate = updateData.endDate ? new Date(updateData.endDate) : event.endDate;
  const newVenueId = updateData.venue !== undefined ? updateData.venue : event.venue;

  if (newStartDate >= newEndDate) {
    throw new ValidationError([
      { field: 'endDate', message: 'End date must be after start date' },
    ]);
  }

  if (newVenueId) {
    await checkVenueConflict(newVenueId, newStartDate, newEndDate, eventId);
  }

  if (updateData.title && updateData.title !== event.title) {
    updateData.slug = await generateUniqueSlug(updateData.title);
  }

  if (updateData.startDate) updateData.startDate = newStartDate;
  if (updateData.endDate) updateData.endDate = newEndDate;
  if (updateData.registrationDeadline) {
    updateData.registrationDeadline = new Date(updateData.registrationDeadline);
  }

  const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, {
    new: true,
    runValidators: true,
  }).populate('venue');

  return updatedEvent;
};

export const deleteEvent = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (user.globalRole !== 'admin') {
    const membership = await EventMembership.findOne({
      user: user._id,
      event: eventId,
      role: 'organizer',
    });
    const isOrgMatch = user.organization && user.organization.equals(event.organization);

    if (!membership && !isOrgMatch) {
      throw new ForbiddenError('Only event organizers can delete this event');
    }
  }

  // Soft delete / cancel if published, hard delete if draft
  if (event.status === 'draft') {
    await Event.findByIdAndDelete(eventId);
    await EventMembership.deleteMany({ event: eventId });
  } else {
    event.status = 'cancelled';
    await event.save();
  }

  return { message: 'Event successfully removed/cancelled' };
};

// Sessions management
export const addSession = async (eventId, user, sessionData) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  const sessionStart = new Date(sessionData.startTime);
  const sessionEnd = new Date(sessionData.endTime);

  // Validate session is within event dates
  if (sessionStart < event.startDate || sessionEnd > event.endDate) {
    throw new ValidationError([
      {
        field: 'startTime',
        message: 'Session timing must fall within event start and end dates',
      },
    ]);
  }

  event.sessions.push({
    ...sessionData,
    startTime: sessionStart,
    endTime: sessionEnd,
  });

  await event.save();
  return event.sessions[event.sessions.length - 1];
};

export const updateSession = async (eventId, sessionId, user, sessionData) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  const session = event.sessions.id(sessionId);
  if (!session) throw new NotFoundError('Session');

  if (sessionData.startTime || sessionData.endTime) {
    const start = sessionData.startTime ? new Date(sessionData.startTime) : session.startTime;
    const end = sessionData.endTime ? new Date(sessionData.endTime) : session.endTime;
    if (start >= end) {
      throw new ValidationError([
        { field: 'endTime', message: 'Session end time must be after start time' },
      ]);
    }
    if (start < event.startDate || end > event.endDate) {
      throw new ValidationError([
        {
          field: 'startTime',
          message: 'Session timing must fall within event start and end dates',
        },
      ]);
    }
    sessionData.startTime = start;
    sessionData.endTime = end;
  }

  Object.assign(session, sessionData);
  await event.save();
  return session;
};

export const deleteSession = async (eventId, sessionId, user) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  event.sessions.pull(sessionId);
  await event.save();
  return { message: 'Session deleted successfully' };
};

// Event Members / Team Management (User-approved changes #3 & #4)
export const getEventMembers = async (eventId) => {
  const members = await EventMembership.find({ event: eventId })
    .populate('user', 'name email avatar')
    .sort({ createdAt: 1 });
  return members;
};

export const addEventMember = async (eventId, organizerUser, { email, role, name }) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  let targetUser = await User.findOne({ email: email.toLowerCase() });

  if (!targetUser) {
    // User-approved change #4: Invite flow creates user stub and sends invite link
    targetUser = await User.create({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash: 'INVITE_PENDING',
      isActive: true,
    });
  }

  const existingMembership = await EventMembership.findOne({
    user: targetUser._id,
    event: eventId,
  });

  if (existingMembership) {
    throw new ConflictError(`User is already an event ${existingMembership.role}`);
  }

  const membership = await EventMembership.create({
    user: targetUser._id,
    event: eventId,
    role,
  });

  // User-approved change #4: Email stub for the invite link
  await sendEmail({
    to: email,
    subject: `You have been invited as a ${role} for ${event.title}`,
    text: `Hello, you've been invited as a ${role} to ${event.title}. Use this link to activate your access: https://eventforge.com/invite?eventId=${eventId}&email=${encodeURIComponent(email)}`,
  });

  return membership.populate('user', 'name email avatar');
};

export const removeEventMember = async (eventId, membershipId) => {
  const membership = await EventMembership.findOneAndDelete({
    _id: membershipId,
    event: eventId,
  });
  if (!membership) throw new NotFoundError('Event Membership');
  return { message: 'Member removed from event' };
};
