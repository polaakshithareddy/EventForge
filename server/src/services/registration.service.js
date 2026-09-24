import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Registration } from '../models/Registration.js';
import { Event } from '../models/Event.js';
import { Organization } from '../models/Organization.js';
import { EventMembership } from '../models/EventMembership.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../utils/AppError.js';
import { sendEmail } from './email.service.js';

// Helper to generate readable, unique ticket codes
const generateTicketCode = () => {
  const timePart = Date.now().toString(36).toUpperCase().slice(-5);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EF-${timePart}-${randomPart}`;
};

// Check if user has organizer rights to the event
const verifyOrganizerOrAdmin = async (eventId, user) => {
  if (user.globalRole === 'admin') return true;

  const membership = await EventMembership.findOne({
    event: eventId,
    user: user._id,
    role: { $in: ['organizer', 'staff'] },
  });

  const event = await Event.findById(eventId);
  const isOrgMatch = event && user.organization && user.organization.equals(event.organization);

  if (!membership && !isOrgMatch) {
    throw new ForbiddenError('Organizer or staff access required for this event');
  }

  return true;
};

export const registerForEvent = async (user, eventId, { ticketTypeName, notes }) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotFoundError('Event');
  }

  if (event.status === 'cancelled') {
    throw new ConflictError('This event has been cancelled and is no longer accepting registrations');
  }

  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    throw new ValidationError([
      { field: 'registrationDeadline', message: 'Registration deadline has passed for this event' },
    ]);
  }

  // 1. Prevent duplicate registration by the same attendee
  const existingReg = await Registration.findOne({
    event: eventId,
    user: user._id,
    status: { $ne: 'cancelled' },
  });

  if (existingReg) {
    throw new ConflictError('You have already registered for this event');
  }

  // 2. Capacity Check
  const confirmedAttendees = await Registration.countDocuments({
    event: eventId,
    status: 'confirmed',
  });

  if (confirmedAttendees >= event.capacity) {
    throw new ConflictError('This event is fully booked and at capacity');
  }

  // 3. Organization subscription attendee limit enforcement (User-approved change #5)
  const org = await Organization.findById(event.organization);
  if (org) {
    const maxAttendees = org.subscription?.limits?.maxAttendees ?? 100;
    if (confirmedAttendees >= maxAttendees) {
      throw new ForbiddenError(
        `Organization attendee limit reached (max: ${maxAttendees}). Please contact the event organizer.`
      );
    }
  }

  // 4. Validate Ticket Type & Pricing
  let ticketTier = { name: 'General Admission', price: 0 };

  if (event.ticketTypes && event.ticketTypes.length > 0) {
    const matched = event.ticketTypes.find(
      (t) => t.name.toLowerCase() === ticketTypeName.toLowerCase()
    );

    if (!matched) {
      throw new NotFoundError(`Ticket tier "${ticketTypeName}"`);
    }

    if (matched.quantity && (matched.sold || 0) >= matched.quantity) {
      throw new ConflictError(`Ticket tier "${matched.name}" is sold out`);
    }

    matched.sold = (matched.sold || 0) + 1;
    ticketTier = { name: matched.name, price: matched.price };
  }

  // 5. Initial Payment Status (User-approved change #1)
  const isFree = ticketTier.price === 0;
  const paymentStatus = isFree ? 'free' : 'unpaid';
  const paidAt = isFree ? new Date() : undefined;

  // 6. Generate Ticket Code & QR Code
  let ticketCode;
  let codeUnique = false;
  while (!codeUnique) {
    ticketCode = generateTicketCode();
    codeUnique = !(await Registration.exists({ ticketCode }));
  }

  const qrPayload = JSON.stringify({
    ticketCode,
    eventId: event._id.toString(),
    userId: user._id.toString(),
    attendee: user.name,
    eventTitle: event.title,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });

  // 7. Save Registration
  const registration = await Registration.create({
    event: eventId,
    user: user._id,
    ticketType: ticketTier,
    ticketCode,
    qrCode: qrCodeDataUrl,
    status: 'confirmed',
    paymentStatus,
    paidAt,
    notes,
  });

  // Update Event registration counter & ticket sold count
  event.registrationCount = (event.registrationCount || 0) + 1;
  await event.save();

  // 8. Confirmation Email Stub
  await sendEmail({
    to: user.email,
    subject: `Registration Confirmed: ${event.title}`,
    text: `Hello ${user.name},\n\nYour registration for "${event.title}" is confirmed!\n\nTicket: ${ticketTier.name} ($${ticketTier.price})\nTicket Code: ${ticketCode}\nPayment Status: ${paymentStatus.toUpperCase()}\n\nPlease present your ticket QR code upon arrival at check-in.\n\nThank you,\nEventForge Team`,
  });

  return registration.populate([
    { path: 'event', select: 'title slug startDate endDate venue isVirtual virtualLink' },
    { path: 'user', select: 'name email avatar' },
  ]);
};

export const getMyRegistrations = async (userId) => {
  const registrations = await Registration.find({
    user: userId,
    status: { $ne: 'cancelled' },
  })
    .populate({
      path: 'event',
      populate: { path: 'venue', select: 'name address' },
    })
    .sort({ createdAt: -1 });

  return registrations;
};

export const getEventRegistrations = async (eventId, user, query = {}) => {
  await verifyOrganizerOrAdmin(eventId, user);

  const { page = 1, limit = 25, search, paymentStatus, checkedIn, status } = query;
  const filter = { event: eventId };

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (checkedIn !== undefined) {
    filter.checkedIn = checkedIn === 'true' || checkedIn === true;
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  // If search query is provided, find matching users
  if (search) {
    const matchingUsers = await (
      await import('../models/User.js')
    ).User.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ],
    }).select('_id');

    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { user: { $in: userIds } },
      { ticketCode: new RegExp(search, 'i') },
    ];
  }

  const [registrations, total, summaryAgg] = await Promise.all([
    Registration.find(filter)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Registration.countDocuments(filter),
    Registration.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          unpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] } },
          free: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'free'] }, 1, 0] } },
          checkedIn: { $sum: { $cond: [{ $eq: ['$checkedIn', true] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', ['paid']] },
                '$ticketType.price',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || {
    total: 0,
    paid: 0,
    unpaid: 0,
    free: 0,
    checkedIn: 0,
    revenue: 0,
  };

  return {
    registrations,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / parsedLimit),
    summary,
  };
};

export const getRegistrationById = async (id, user) => {
  const registration = await Registration.findById(id)
    .populate({
      path: 'event',
      populate: { path: 'venue', select: 'name address' },
    })
    .populate('user', 'name email avatar');

  if (!registration) {
    throw new NotFoundError('Registration');
  }

  // Access check: User owns registration or is organizer/admin
  const isOwner = registration.user._id.equals(user._id);
  if (!isOwner) {
    await verifyOrganizerOrAdmin(registration.event._id, user);
  }

  return registration;
};

// Organizer "mark as paid" action (User-approved change #1)
export const markAsPaid = async (registrationId, user) => {
  const registration = await Registration.findById(registrationId);
  if (!registration) {
    throw new NotFoundError('Registration');
  }

  await verifyOrganizerOrAdmin(registration.event, user);

  registration.paymentStatus = 'paid';
  registration.paidAt = new Date();
  await registration.save();

  return registration.populate('user', 'name email');
};

// Check-in attendee via QR payload or Ticket Code
export const checkInAttendee = async (eventId, rawTicketCodeOrPayload, user) => {
  await verifyOrganizerOrAdmin(eventId, user);

  let cleanTicketCode = rawTicketCodeOrPayload.trim();

  // If payload is JSON from a QR scanner, parse the ticketCode
  if (cleanTicketCode.startsWith('{') && cleanTicketCode.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanTicketCode);
      if (parsed.ticketCode) {
        cleanTicketCode = parsed.ticketCode;
      }
    } catch {
      // Keep as string
    }
  }

  const registration = await Registration.findOne({
    event: eventId,
    ticketCode: cleanTicketCode.toUpperCase(),
  })
    .populate('user', 'name email avatar')
    .populate('event', 'title startDate endDate');

  if (!registration) {
    throw new NotFoundError(`Ticket with code "${cleanTicketCode}" not found for this event`);
  }

  if (registration.status === 'cancelled') {
    throw new ConflictError('Cannot check in: this registration was cancelled');
  }

  if (registration.checkedIn) {
    throw new ConflictError(
      `Attendee already checked in at ${new Date(registration.checkedInAt).toLocaleTimeString()}`
    );
  }

  registration.checkedIn = true;
  registration.checkedInAt = new Date();
  await registration.save();

  return {
    registration,
    message: `Welcome, ${registration.user?.name || 'Attendee'}! Check-in confirmed.`,
  };
};

// Cancel Registration
export const cancelRegistration = async (registrationId, user) => {
  const registration = await Registration.findById(registrationId);
  if (!registration) {
    throw new NotFoundError('Registration');
  }

  const isOwner = registration.user.equals(user._id);
  if (!isOwner) {
    await verifyOrganizerOrAdmin(registration.event, user);
  }

  if (registration.status === 'cancelled') {
    throw new ConflictError('Registration is already cancelled');
  }

  registration.status = 'cancelled';
  await registration.save();

  // Release ticket count on Event
  const event = await Event.findById(registration.event);
  if (event) {
    event.registrationCount = Math.max(0, (event.registrationCount || 1) - 1);
    const matchedTier = event.ticketTypes?.find(
      (t) => t.name.toLowerCase() === registration.ticketType.name.toLowerCase()
    );
    if (matchedTier && matchedTier.sold > 0) {
      matchedTier.sold -= 1;
    }
    await event.save();
  }

  return { message: 'Registration cancelled successfully' };
};
