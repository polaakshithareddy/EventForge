import apiClient from './client';

export const getEventSessions = async (eventId, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiClient.get(`/sessions/event/${eventId}?${query.toString()}`);
};

export const getEventSchedule = async (eventId) => {
  return apiClient.get(`/sessions/event/${eventId}/schedule`);
};

export const getEventSpeakers = async (eventId) => {
  return apiClient.get(`/sessions/event/${eventId}/speakers`);
};

export const createSession = async (eventId, data) => {
  return apiClient.post(`/sessions/event/${eventId}`, data);
};

export const updateSession = async (id, data) => {
  return apiClient.patch(`/sessions/${id}`, data);
};

export const deleteSession = async (id) => {
  return apiClient.delete(`/sessions/${id}`);
};

export const inviteSpeaker = async (eventId, data) => {
  return apiClient.post(`/sessions/event/${eventId}/speakers/invite`, data);
};

export const updateSpeakerProfile = async (eventId, speakerId, data) => {
  return apiClient.patch(`/sessions/event/${eventId}/speakers/${speakerId}/profile`, data);
};
