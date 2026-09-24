import apiClient from './client';

export const registerForEvent = async (data) => {
  return apiClient.post('/registrations', data);
};

export const getMyRegistrations = async () => {
  return apiClient.get('/registrations/me');
};

export const getRegistration = async (id) => {
  return apiClient.get(`/registrations/${id}`);
};

export const getEventRegistrations = async (eventId, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiClient.get(`/registrations/event/${eventId}?${query.toString()}`);
};

export const markAsPaid = async (registrationId) => {
  return apiClient.patch(`/registrations/${registrationId}/pay`);
};

export const checkInAttendee = async (eventId, ticketCode) => {
  return apiClient.post(`/registrations/event/${eventId}/checkin`, { ticketCode });
};

export const cancelRegistration = async (registrationId) => {
  return apiClient.delete(`/registrations/${registrationId}`);
};
