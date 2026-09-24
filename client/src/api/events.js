import apiClient from './client';

export const getPublicEvents = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiClient.get(`/events/public?${query.toString()}`);
};

export const getPublicEvent = async (slug) => {
  return apiClient.get(`/events/public/${slug}`);
};

export const getOrgEvents = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiClient.get(`/events/org?${query.toString()}`);
};

export const getEvent = async (id) => {
  return apiClient.get(`/events/${id}`);
};

export const createEvent = async (data) => {
  return apiClient.post('/events', data);
};

export const updateEvent = async (id, data) => {
  return apiClient.patch(`/events/${id}`, data);
};

export const deleteEvent = async (id) => {
  return apiClient.delete(`/events/${id}`);
};

export const addSession = async (eventId, data) => {
  return apiClient.post(`/events/${eventId}/sessions`, data);
};

export const updateSession = async (eventId, sessionId, data) => {
  return apiClient.patch(`/events/${eventId}/sessions/${sessionId}`, data);
};

export const deleteSession = async (eventId, sessionId) => {
  return apiClient.delete(`/events/${eventId}/sessions/${sessionId}`);
};

export const getEventMembers = async (eventId) => {
  return apiClient.get(`/events/${eventId}/members`);
};

export const inviteMember = async (eventId, data) => {
  return apiClient.post(`/events/${eventId}/members`, data);
};

export const removeMember = async (eventId, memberId) => {
  return apiClient.delete(`/events/${eventId}/members/${memberId}`);
};
