import path from 'path';
import fs from 'fs';
import { Sponsor } from '../models/Sponsor.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { EventMembership } from '../models/EventMembership.js';
import { sendEmail } from './email.service.js';
import { CONTRACTS_UPLOAD_PATH } from '../middleware/upload.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../utils/AppError.js';

// Verify organizer or staff permissions on event
const checkEventOrganizerPermission = async (eventId, user) => {
  if (user.role === 'superadmin') return true;

  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  // Check if user's organization owns the event
  if (
    user.organization &&
    (user.organization.toString() === event.organization.toString() ||
      user.organization._id?.toString() === event.organization.toString())
  ) {
    return true;
  }

  // Check EventMembership role
  const membership = await EventMembership.findOne({
    user: user._id,
    event: eventId,
    role: { $in: ['organizer', 'staff'] },
  });

  if (!membership) {
    throw new ForbiddenError('You do not have permission to manage sponsors for this event.');
  }

  return true;
};

export const createSponsor = async (eventId, user, data, file = null) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  await checkEventOrganizerPermission(eventId, user);

  // Check booth conflict if boothNumber specified
  if (data.boothNumber?.trim()) {
    const existingBooth = await Sponsor.findOne({
      event: eventId,
      boothNumber: data.boothNumber.trim(),
    });
    if (existingBooth) {
      throw new ConflictError(
        `Booth "${data.boothNumber}" is already allocated to sponsor "${existingBooth.name}".`
      );
    }
  }

  const sponsorPayload = {
    ...data,
    event: eventId,
  };

  if (file) {
    sponsorPayload.contractDocument = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
  }

  const sponsor = await Sponsor.create(sponsorPayload);
  return sponsor;
};

export const getEventSponsors = async (eventId, query = {}) => {
  const { tier, search } = query;
  const filter = { event: eventId };

  if (tier) filter.tier = tier;
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { boothNumber: new RegExp(search, 'i') },
    ];
  }

  const sponsors = await Sponsor.find(filter)
    .populate('representatives', 'name email avatar jobTitle')
    .sort({ order: 1, createdAt: 1 });

  return sponsors;
};

export const getEventSponsorsByTier = async (eventId) => {
  const sponsors = await Sponsor.find({ event: eventId })
    .populate('representatives', 'name email avatar jobTitle')
    .sort({ order: 1, createdAt: 1 });

  const tiers = {
    platinum: [],
    gold: [],
    silver: [],
    bronze: [],
    partner: [],
  };

  sponsors.forEach((s) => {
    if (tiers[s.tier]) {
      tiers[s.tier].push(s);
    } else {
      tiers.silver.push(s);
    }
  });

  return {
    total: sponsors.length,
    tiers,
    all: sponsors,
  };
};

export const getSponsorById = async (sponsorId) => {
  const sponsor = await Sponsor.findById(sponsorId)
    .populate('event', 'title startDate endDate slug organization')
    .populate('representatives', 'name email avatar jobTitle');

  if (!sponsor) throw new NotFoundError('Sponsor');
  return sponsor;
};

export const updateSponsor = async (sponsorId, user, data, file = null) => {
  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new NotFoundError('Sponsor');

  await checkEventOrganizerPermission(sponsor.event, user);

  // Check booth conflict if boothNumber changed
  if (data.boothNumber && data.boothNumber.trim() !== sponsor.boothNumber) {
    const existingBooth = await Sponsor.findOne({
      event: sponsor.event,
      boothNumber: data.boothNumber.trim(),
      _id: { $ne: sponsorId },
    });
    if (existingBooth) {
      throw new ConflictError(
        `Booth "${data.boothNumber}" is already allocated to sponsor "${existingBooth.name}".`
      );
    }
  }

  Object.assign(sponsor, data);

  if (file) {
    // Delete old file if existed
    if (sponsor.contractDocument?.filename) {
      const oldPath = path.join(CONTRACTS_UPLOAD_PATH, sponsor.contractDocument.filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // Ignore unlink errors
        }
      }
    }

    sponsor.contractDocument = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
  }

  await sponsor.save();
  return sponsor;
};

export const deleteSponsor = async (sponsorId, user) => {
  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new NotFoundError('Sponsor');

  await checkEventOrganizerPermission(sponsor.event, user);

  // Clean up contract file
  if (sponsor.contractDocument?.filename) {
    const filePath = path.join(CONTRACTS_UPLOAD_PATH, sponsor.contractDocument.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore
      }
    }
  }

  await Sponsor.findByIdAndDelete(sponsorId);
  return { message: 'Sponsor removed successfully' };
};

// User-approved change #4: Invite sponsor representative via email stub creating EventMembership
export const inviteSponsorRepresentative = async (sponsorId, user, { email, name, company }) => {
  const sponsor = await Sponsor.findById(sponsorId);
  if (!sponsor) throw new NotFoundError('Sponsor');

  const event = await Event.findById(sponsor.event);
  if (!event) throw new NotFoundError('Event');

  await checkEventOrganizerPermission(sponsor.event, user);

  const normalizedEmail = email.toLowerCase().trim();

  // Find or create user stub
  let repUser = await User.findOne({ email: normalizedEmail });
  if (!repUser) {
    repUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: 'INVITE_PENDING',
      company: company || sponsor.name,
      jobTitle: 'Sponsor Representative',
    });
  }

  // Create or update EventMembership with role 'sponsor'
  const membership = await EventMembership.findOneAndUpdate(
    { user: repUser._id, event: event._id },
    { role: 'sponsor' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Add representative to sponsor document
  if (!sponsor.representatives.includes(repUser._id)) {
    sponsor.representatives.push(repUser._id);
    await sponsor.save();
  }

  // Send invitation email stub
  const inviteLink = `https://eventforge.com/sponsor-claim?eventId=${event._id}&sponsorId=${sponsor._id}&email=${encodeURIComponent(normalizedEmail)}`;

  await sendEmail({
    to: normalizedEmail,
    subject: `Sponsor Portal Invitation: ${event.title}`,
    text: `Dear ${name},\n\nYou have been designated as an official sponsor representative for "${sponsor.name}" at "${event.title}".\n\nPlease activate your sponsor portal access here:\n${inviteLink}\n\nBest regards,\nEventForge Team`,
  });

  return {
    success: true,
    sponsor,
    representative: {
      _id: repUser._id,
      name: repUser.name,
      email: repUser.email,
    },
    membership,
    inviteLink,
  };
};

// User-approved change #7: Authenticated route for serving private files
export const getSponsorContractFile = async (sponsorId, user) => {
  const sponsor = await Sponsor.findById(sponsorId).populate('event');
  if (!sponsor) throw new NotFoundError('Sponsor');

  if (!sponsor.contractDocument?.filename) {
    throw new NotFoundError('Contract document');
  }

  // Check authorization: superadmin, event organizer/staff, event owner org, or sponsor rep
  const isSuperAdmin = user.role === 'superadmin';
  const isOwnerOrg =
    user.organization &&
    (user.organization.toString() === sponsor.event.organization.toString() ||
      user.organization._id?.toString() === sponsor.event.organization.toString());

  const isRep = sponsor.representatives.some(
    (repId) => repId.toString() === user._id.toString()
  );

  let isEventStaff = false;
  if (!isSuperAdmin && !isOwnerOrg && !isRep) {
    const membership = await EventMembership.findOne({
      user: user._id,
      event: sponsor.event._id,
      role: { $in: ['organizer', 'staff'] },
    });
    isEventStaff = Boolean(membership);
  }

  if (!isSuperAdmin && !isOwnerOrg && !isRep && !isEventStaff) {
    throw new ForbiddenError('Unauthorized: You do not have access to view this private sponsor contract.');
  }

  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(sponsor.contractDocument.filename);
  const resolvedPath = path.resolve(CONTRACTS_UPLOAD_PATH, safeFilename);

  // Prevent path traversal outside CONTRACTS_UPLOAD_PATH
  if (!resolvedPath.startsWith(CONTRACTS_UPLOAD_PATH)) {
    throw new BadRequestError('Invalid file path');
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new NotFoundError('Contract file on disk');
  }

  return {
    filePath: resolvedPath,
    originalName: sponsor.contractDocument.originalName || safeFilename,
    mimeType: sponsor.contractDocument.mimeType || 'application/octet-stream',
  };
};
