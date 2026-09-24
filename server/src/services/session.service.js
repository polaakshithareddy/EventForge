import { Session } from '../models/Session.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { EventMembership } from '../models/EventMembership.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../utils/AppError.js';
import { sendEmail } from './email.service.js';

// Verify organizer or staff permissions for the event
const verifyOrganizerAccess = async (eventId, user) => {
  if (user.globalRole === 'admin') return true;

  const membership = await EventMembership.findOne({
    event: eventId,
    user: user._id,
    role: { $in: ['organizer', 'staff'] },
  });

  const event = await Event.findById(eventId);
  const isOrgMatch = event && user.organization && user.organization.equals(event.organization);

  if (!membership && !isOrgMatch) {
    throw new ForbiddenError('Organizer access required for this event schedule');
  }

  return true;
};

// Check room & speaker conflicts in UTC (User-approved change #6)
const checkSessionConflicts = async (
  eventId,
  room,
  speakerIds,
  utcStart,
  utcEnd,
  excludeSessionId = null
) => {
  // 1. Room Double-Booking Conflict
  if (room) {
    const roomConflictQuery = {
      event: eventId,
      room: new RegExp(`^${room.trim()}$`, 'i'),
      status: { $ne: 'cancelled' },
      startTime: { $lt: utcEnd },
      endTime: { $gt: utcStart },
    };

    if (excludeSessionId) {
      roomConflictQuery._id = { $ne: excludeSessionId };
    }

    const roomConflict = await Session.findOne(roomConflictQuery);
    if (roomConflict) {
      throw new ConflictError(
        `Room conflict: Room "${room}" is already scheduled for session "${roomConflict.title}" from ${roomConflict.startTime.toISOString()} to ${roomConflict.endTime.toISOString()} UTC.`
      );
    }
  }

  // 2. Speaker Double-Booking Conflict
  if (speakerIds && speakerIds.length > 0) {
    const speakerConflictQuery = {
      event: eventId,
      speakers: { $in: speakerIds },
      status: { $ne: 'cancelled' },
      startTime: { $lt: utcEnd },
      endTime: { $gt: utcStart },
    };

    if (excludeSessionId) {
      speakerConflictQuery._id = { $ne: excludeSessionId };
    }

    const speakerConflict = await Session.findOne(speakerConflictQuery);
    if (speakerConflict) {
      throw new ConflictError(
        `Speaker conflict: A designated speaker is already presenting in overlapping session "${speakerConflict.title}" during this time window.`
      );
    }
  }
};

export const createSession = async (eventId, user, sessionData) => {
  await verifyOrganizerAccess(eventId, user);

  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }

  const utcStart = new Date(sessionData.startTime);
  const utcEnd = new Date(sessionData.endTime);

  if (utcStart >= utcEnd) {
    throw new ValidationError([
      { field: 'endTime', message: 'Session end time must be after start time' },
    ]);
  }

  // Ensure session is within event calendar dates (User-approved change #6)
  if (utcStart < event.startDate || utcEnd > event.endDate) {
    throw new ValidationError([
      {
        field: 'startTime',
        message: `Session timing must be within event dates (${event.startDate.toISOString()} to ${event.endDate.toISOString()} UTC)`,
      },
    ]);
  }

  // Validate conflicts
  await checkSessionConflicts(
    eventId,
    sessionData.room,
    sessionData.speakers,
    utcStart,
    utcEnd
  );

  const session = await Session.create({
    ...sessionData,
    event: eventId,
    startTime: utcStart,
    endTime: utcEnd,
  });

  return session.populate('speakers', 'name email avatar company jobTitle bio');
};

export const getEventSessions = async (eventId, query = {}) => {
  const { track, room, speaker, status, date } = query;
  const filter = { event: eventId };

  if (track) filter['track.name'] = new RegExp(`^${track}$`, 'i');
  if (room) filter.room = new RegExp(`^${room}$`, 'i');
  if (speaker) filter.speakers = speaker;
  if (status) filter.status = status;
  else filter.status = { $ne: 'cancelled' };

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    filter.startTime = { $gte: startOfDay, $lte: endOfDay };
  }

  const sessions = await Session.find(filter)
    .populate('speakers', 'name email avatar company jobTitle bio')
    .sort({ startTime: 1 });

  return sessions;
};

export const getSessionById = async (sessionId) => {
  const session = await Session.findById(sessionId)
    .populate('speakers', 'name email avatar company jobTitle bio socialLinks speakerTopics')
    .populate('event', 'title slug startDate endDate venue');

  if (!session) {
    throw new NotFoundError('Session');
  }

  return session;
};

export const updateSession = async (sessionId, user, updateData) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new NotFoundError('Session');
  }

  await verifyOrganizerAccess(session.event, user);

  const utcStart = updateData.startTime ? new Date(updateData.startTime) : session.startTime;
  const utcEnd = updateData.endTime ? new Date(updateData.endTime) : session.endTime;
  const room = updateData.room !== undefined ? updateData.room : session.room;
  const speakers = updateData.speakers !== undefined ? updateData.speakers : session.speakers;

  if (utcStart >= utcEnd) {
    throw new ValidationError([
      { field: 'endTime', message: 'Session end time must be after start time' },
    ]);
  }

  // Check conflicts
  await checkSessionConflicts(session.event, room, speakers, utcStart, utcEnd, sessionId);

  if (updateData.startTime) updateData.startTime = utcStart;
  if (updateData.endTime) updateData.endTime = utcEnd;

  const updatedSession = await Session.findByIdAndUpdate(sessionId, updateData, {
    new: true,
    runValidators: true,
  }).populate('speakers', 'name email avatar company jobTitle bio');

  return updatedSession;
};

export const deleteSession = async (sessionId, user) => {
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new NotFoundError('Session');
  }

  await verifyOrganizerAccess(session.event, user);

  await Session.findByIdAndDelete(sessionId);
  return { message: 'Session deleted successfully' };
};

// Multi-Track visual schedule grouping (grouped by day and tracks)
export const getEventSchedule = async (eventId) => {
  const sessions = await Session.find({
    event: eventId,
    status: { $ne: 'cancelled' },
  })
    .populate('speakers', 'name email avatar company jobTitle')
    .sort({ startTime: 1 });

  // Extract distinct tracks
  const tracksMap = new Map();
  sessions.forEach((s) => {
    if (s.track?.name && !tracksMap.has(s.track.name)) {
      tracksMap.set(s.track.name, s.track.color || '#4f46e5');
    }
  });

  const tracks = Array.from(tracksMap.entries()).map(([name, color]) => ({ name, color }));

  // Group by UTC day (YYYY-MM-DD)
  const daysMap = {};
  sessions.forEach((session) => {
    const dayKey = session.startTime.toISOString().slice(0, 10);
    if (!daysMap[dayKey]) {
      daysMap[dayKey] = {
        date: dayKey,
        formattedDate: new Date(session.startTime).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        sessions: [],
      };
    }
    daysMap[dayKey].sessions.push(session);
  });

  const days = Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    tracks: tracks.length > 0 ? tracks : [{ name: 'General', color: '#4f46e5' }],
    days,
    totalSessions: sessions.length,
  };
};

// Speaker Directory & Invite Management (User-approved changes #3 & #4)
export const getEventSpeakers = async (eventId) => {
  const memberships = await EventMembership.find({
    event: eventId,
    role: 'speaker',
  }).populate('user', 'name email avatar bio company jobTitle socialLinks speakerTopics');

  // Also query sessions for each speaker
  const speakersWithSessions = await Promise.all(
    memberships.map(async (m) => {
      const userDoc = m.user;
      if (!userDoc) return null;

      const sessions = await Session.find({
        event: eventId,
        speakers: userDoc._id,
        status: { $ne: 'cancelled' },
      }).select('title room startTime endTime track');

      return {
        _id: userDoc._id,
        membershipId: m._id,
        name: userDoc.name,
        email: userDoc.email,
        avatar: userDoc.avatar,
        bio: userDoc.bio,
        company: userDoc.company,
        jobTitle: userDoc.jobTitle,
        socialLinks: userDoc.socialLinks,
        speakerTopics: userDoc.speakerTopics,
        sessions,
      };
    })
  );

  return speakersWithSessions.filter(Boolean);
};

export const inviteSpeaker = async (eventId, organizerUser, speakerData) => {
  await verifyOrganizerAccess(eventId, organizerUser);

  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  const { email, name, bio, company, jobTitle, speakerTopics } = speakerData;

  let targetUser = await User.findOne({ email: email.toLowerCase() });

  if (!targetUser) {
    targetUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: 'INVITE_PENDING',
      bio,
      company,
      jobTitle,
      speakerTopics: speakerTopics || [],
      isActive: true,
    });
  } else {
    // Update speaker profile information
    if (bio) targetUser.bio = bio;
    if (company) targetUser.company = company;
    if (jobTitle) targetUser.jobTitle = jobTitle;
    if (speakerTopics) targetUser.speakerTopics = speakerTopics;
    await targetUser.save();
  }

  // Ensure speaker EventMembership exists (User-approved change #3)
  let membership = await EventMembership.findOne({
    event: eventId,
    user: targetUser._id,
  });

  if (!membership) {
    membership = await EventMembership.create({
      event: eventId,
      user: targetUser._id,
      role: 'speaker',
    });
  } else if (membership.role !== 'speaker' && membership.role !== 'organizer') {
    membership.role = 'speaker';
    await membership.save();
  }

  // Dispatch invitation email stub (User-approved change #4)
  await sendEmail({
    to: email,
    subject: `Speaker Invitation: ${event.title}`,
    text: `Dear ${name},\n\nYou have been invited as a distinguished speaker for "${event.title}".\n\nPlease activate your speaker portal and review your session schedule here:\nhttps://eventforge.com/speaker-claim?eventId=${eventId}&email=${encodeURIComponent(email)}\n\nBest regards,\nEventForge Team`,
  });

  return {
    _id: targetUser._id,
    membershipId: membership._id,
    name: targetUser.name,
    email: targetUser.email,
    bio: targetUser.bio,
    company: targetUser.company,
    jobTitle: targetUser.jobTitle,
    speakerTopics: targetUser.speakerTopics,
  };
};

export const updateSpeakerProfile = async (eventId, speakerUserId, user, profileData) => {
  // Allow speaker to update their own profile, or event organizer
  const isSelf = user._id.equals(speakerUserId);
  if (!isSelf) {
    await verifyOrganizerAccess(eventId, user);
  }

  const updatedUser = await User.findByIdAndUpdate(
    speakerUserId,
    profileData,
    { new: true, runValidators: true }
  ).select('name email avatar bio company jobTitle socialLinks speakerTopics');

  if (!updatedUser) throw new NotFoundError('Speaker user');
  return updatedUser;
};
