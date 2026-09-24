import apiClient from './client';

export const getPublicSponsors = async (eventId) => {
  return apiClient.get(`/sponsors/event/${eventId}`);
};

export const getPublicSponsorsByTier = async (eventId) => {
  return apiClient.get(`/sponsors/event/${eventId}/tiers`);
};

export const getSponsor = async (id) => {
  return apiClient.get(`/sponsors/${id}`);
};

export const createSponsor = async (eventId, data) => {
  // If data is FormData, send with multipart/form-data headers
  const isFormData = data instanceof FormData;
  return apiClient.post(`/sponsors/event/${eventId}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

export const updateSponsor = async (id, data) => {
  const isFormData = data instanceof FormData;
  return apiClient.patch(`/sponsors/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

export const deleteSponsor = async (id) => {
  return apiClient.delete(`/sponsors/${id}`);
};

export const inviteSponsorRepresentative = async (id, data) => {
  return apiClient.post(`/sponsors/${id}/invite`, data);
};

export const downloadSponsorContract = async (id) => {
  const response = await apiClient.get(`/sponsors/${id}/contract`, {
    responseType: 'blob',
  });
  return response;
};
