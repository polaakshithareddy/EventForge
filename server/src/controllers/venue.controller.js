import * as venueService from '../services/venue.service.js';

export const createVenue = async (req, res) => {
  const venue = await venueService.createVenue(req.user.organization, req.body);
  res.status(201).json({
    success: true,
    data: { venue },
    message: 'Venue created successfully',
  });
};

export const getVenues = async (req, res) => {
  const result = await venueService.getVenues(req.user.organization, req.query);
  res.json({
    success: true,
    data: result,
  });
};

export const getVenue = async (req, res) => {
  const venue = await venueService.getVenueById(req.user.organization, req.params.id);
  res.json({
    success: true,
    data: { venue },
  });
};

export const updateVenue = async (req, res) => {
  const venue = await venueService.updateVenue(req.user.organization, req.params.id, req.body);
  res.json({
    success: true,
    data: { venue },
    message: 'Venue updated successfully',
  });
};

export const deleteVenue = async (req, res) => {
  const result = await venueService.deleteVenue(req.user.organization, req.params.id);
  res.json({
    success: true,
    message: result.message,
  });
};
