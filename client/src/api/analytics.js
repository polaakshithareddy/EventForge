import apiClient from './client';

export const getEventAnalytics = async (eventId) => {
  return apiClient.get(`/analytics/event/${eventId}/overview`);
};

export const downloadAttendeeCSV = async (eventId) => {
  const response = await apiClient.get(`/analytics/event/${eventId}/export/attendees`, {
    responseType: 'blob',
  });
  return response;
};

export const getBadgeData = async (eventId) => {
  return apiClient.get(`/analytics/event/${eventId}/badges`);
};
