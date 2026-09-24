import apiClient from './client';

export const generateEventCopy = async (data) => {
  return apiClient.post('/ai/generate-event-copy', data);
};

export const generateAgenda = async (data) => {
  return apiClient.post('/ai/generate-agenda', data);
};

export const polishSpeakerBio = async (data) => {
  return apiClient.post('/ai/polish-speaker-bio', data);
};

export const recommendSessions = async (data) => {
  return apiClient.post('/ai/recommend-sessions', data);
};

export const copilotChat = async (data) => {
  return apiClient.post('/ai/copilot-chat', data);
};
