import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { Registration } from '../models/Registration.js';
import { Session } from '../models/Session.js';
import { Sponsor } from '../models/Sponsor.js';
import { EventMembership } from '../models/EventMembership.js';
import { NotFoundError, ForbiddenError } from '../utils/AppError.js';

// Verify organizer/staff access
const checkEventOrganizerAccess = async (eventId, user) => {
  if (user.role === 'superadmin') return true;

  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  if (
    user.organization &&
    (user.organization.toString() === event.organization.toString() ||
      user.organization._id?.toString() === event.organization.toString())
  ) {
    return true;
  }

  const membership = await EventMembership.findOne({
    user: user._id,
    event: eventId,
    role: { $in: ['organizer', 'staff'] },
  });

  if (!membership) {
    throw new ForbiddenError('You do not have permission to view analytics for this event.');
  }

  return true;
};

export const getEventOverviewAnalytics = async (eventId, user) => {
  const event = await Event.findById(eventId).populate('venue');
  if (!event) throw new NotFoundError('Event');

  await checkEventOrganizerAccess(eventId, user);

  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  // 1. Registrations Aggregation
  const [regStats, checkinTimeline, tierBreakdown] = await Promise.all([
    Registration.aggregate([
      { $match: { event: eventObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
          },
          checkedIn: {
            $sum: { $cond: [{ $eq: ['$checkedIn', true] }, 1, 0] },
          },
          paid: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          free: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'free'] }, 1, 0] },
          },
          unpaid: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] },
          },
          refunded: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'confirmed'] },
                    { $eq: ['$paymentStatus', 'paid'] },
                  ],
                },
                '$ticketType.price',
                0,
              ],
            },
          },
        },
      },
    ]),

    // 2. Check-in Timeline (grouped by hour)
    Registration.aggregate([
      {
        $match: {
          event: eventObjectId,
          checkedIn: true,
          checkedInAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d %H:00', date: '$checkedInAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 3. Ticket Tier Breakdown
    Registration.aggregate([
      { $match: { event: eventObjectId, status: 'confirmed' } },
      {
        $group: {
          _id: '$ticketType.name',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$ticketType.price', 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  // 4. Session & Speaker Metrics
  const [sessionsCount, distinctSpeakers, sponsorsCount] = await Promise.all([
    Session.countDocuments({ event: eventId }),
    Session.distinct('speakers', { event: eventId }),
    Sponsor.countDocuments({ event: eventId }),
  ]);

  const stats = regStats[0] || {
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    paid: 0,
    free: 0,
    unpaid: 0,
    refunded: 0,
    totalRevenue: 0,
  };

  const capacity = event.capacity || 0;
  const capacityUtilization = capacity > 0 ? Math.round((stats.confirmed / capacity) * 100) : 0;
  const checkinRate = stats.confirmed > 0 ? Math.round((stats.checkedIn / stats.confirmed) * 100) : 0;

  return {
    event: {
      _id: event._id,
      title: event.title,
      capacity,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
    },
    metrics: {
      totalRegistrations: stats.total,
      confirmedRegistrations: stats.confirmed,
      checkedInCount: stats.checkedIn,
      checkinRate,
      capacityUtilization,
      totalRevenue: stats.totalRevenue,
      paymentBreakdown: {
        paid: stats.paid,
        free: stats.free,
        unpaid: stats.unpaid,
        refunded: stats.refunded,
      },
      sessionsCount,
      speakersCount: distinctSpeakers.length,
      sponsorsCount,
    },
    tierBreakdown: tierBreakdown.map((t) => ({
      tierName: t._id || 'Standard',
      count: t.count,
      revenue: t.revenue,
    })),
    checkinTimeline: checkinTimeline.map((item) => ({
      timestamp: item._id,
      count: item.count,
    })),
  };
};

export const exportAttendeeRosterCSV = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError('Event');

  await checkEventOrganizerAccess(eventId, user);

  const registrations = await Registration.find({ event: eventId })
    .populate('user', 'name email company jobTitle')
    .sort({ createdAt: -1 });

  // Escape CSV field (handles quotes, commas, newlines)
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    'Attendee Name',
    'Attendee Email',
    'Company',
    'Job Title',
    'Ticket Tier',
    'Price ($)',
    'Payment Status',
    'Ticket Code',
    'Registration Status',
    'Checked In',
    'Checked In UTC',
    'Registered Date UTC',
    'Notes',
  ];

  const rows = registrations.map((r) => [
    escapeCsv(r.user?.name || 'N/A'),
    escapeCsv(r.user?.email || 'N/A'),
    escapeCsv(r.user?.company || ''),
    escapeCsv(r.user?.jobTitle || ''),
    escapeCsv(r.ticketType?.name || 'Standard'),
    escapeCsv(r.ticketType?.price ?? 0),
    escapeCsv(r.paymentStatus.toUpperCase()),
    escapeCsv(r.ticketCode),
    escapeCsv(r.status.toUpperCase()),
    escapeCsv(r.checkedIn ? 'YES' : 'NO'),
    escapeCsv(r.checkedInAt ? r.checkedInAt.toISOString() : ''),
    escapeCsv(r.createdAt.toISOString()),
    escapeCsv(r.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  return {
    filename: `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attendees.csv`,
    csvContent,
  };
};

export const getAttendeeBadgeData = async (eventId, user) => {
  const event = await Event.findById(eventId).populate('venue');
  if (!event) throw new NotFoundError('Event');

  await checkEventOrganizerAccess(eventId, user);

  const registrations = await Registration.find({
    event: eventId,
    status: 'confirmed',
  })
    .populate('user', 'name email company jobTitle avatar')
    .sort({ 'user.name': 1 });

  return {
    event: {
      _id: event._id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      venueName: event.venue?.name || 'Main Conference Center',
      city: event.venue?.address?.city || '',
    },
    totalBadges: registrations.length,
    badges: registrations.map((reg) => ({
      registrationId: reg._id,
      name: reg.user?.name || 'Attendee',
      email: reg.user?.email || '',
      company: reg.user?.company || '',
      jobTitle: reg.user?.jobTitle || '',
      ticketTier: reg.ticketType?.name || 'Standard',
      ticketCode: reg.ticketCode,
      qrCodeDataUrl: reg.qrCode,
      paymentStatus: reg.paymentStatus,
      checkedIn: reg.checkedIn,
      status: reg.status,
    })),
  };
};
