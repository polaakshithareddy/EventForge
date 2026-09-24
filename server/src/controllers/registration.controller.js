import * as registrationService from '../services/registration.service.js';

export const register = async (req, res) => {
  const { eventId, ticketTypeName, notes } = req.body;
  const registration = await registrationService.registerForEvent(req.user, eventId, {
    ticketTypeName,
    notes,
  });

  res.status(201).json({
    success: true,
    data: { registration },
    message: 'Registration successful! Your pass is ready.',
  });
};

export const getMyRegistrations = async (req, res) => {
  const registrations = await registrationService.getMyRegistrations(req.user._id);
  res.json({
    success: true,
    data: { registrations },
  });
};

export const getEventRegistrations = async (req, res) => {
  const result = await registrationService.getEventRegistrations(
    req.params.eventId,
    req.user,
    req.query
  );
  res.json({
    success: true,
    data: result,
  });
};

export const getRegistration = async (req, res) => {
  const registration = await registrationService.getRegistrationById(req.params.id, req.user);
  res.json({
    success: true,
    data: { registration },
  });
};

export const markAsPaid = async (req, res) => {
  const registration = await registrationService.markAsPaid(req.params.id, req.user);
  res.json({
    success: true,
    data: { registration },
    message: 'Registration marked as paid successfully',
  });
};

export const checkIn = async (req, res) => {
  const { ticketCode } = req.body;
  const result = await registrationService.checkInAttendee(
    req.params.eventId,
    ticketCode,
    req.user
  );
  res.json({
    success: true,
    data: { registration: result.registration },
    message: result.message,
  });
};

export const cancelRegistration = async (req, res) => {
  const result = await registrationService.cancelRegistration(req.params.id, req.user);
  res.json({
    success: true,
    message: result.message,
  });
};
