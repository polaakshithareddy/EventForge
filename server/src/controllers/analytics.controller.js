import * as analyticsService from '../services/analytics.service.js';

export const getEventOverview = async (req, res) => {
  const data = await analyticsService.getEventOverviewAnalytics(
    req.params.eventId,
    req.user
  );

  res.json({
    success: true,
    data,
  });
};

export const exportAttendeesCSV = async (req, res) => {
  const { filename, csvContent } = await analyticsService.exportAttendeeRosterCSV(
    req.params.eventId,
    req.user
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`
  );

  res.status(200).send(csvContent);
};

export const getAttendeeBadges = async (req, res) => {
  const data = await analyticsService.getAttendeeBadgeData(
    req.params.eventId,
    req.user
  );

  res.json({
    success: true,
    data,
  });
};
