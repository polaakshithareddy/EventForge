import apiClient from './client';

export const getVenues = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return apiClient.get(`/venues?${query.toString()}`);
};

export const getVenue = async (id) => {
  return apiClient.get(`/venues/${id}`);
};

export const createVenue = async (data) => {
  return apiClient.post('/venues', data);
};

export const updateVenue = async (id, data) => {
  return apiClient.patch(`/venues/${id}`, data);
};

export const deleteVenue = async (id) => {
  return apiClient.delete(`/venues/${id}`);
};
