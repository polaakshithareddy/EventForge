import * as eventService from '../services/event.service.js';

export const createEvent = async (req, res) => {
  const event = await eventService.createEvent(req.user, req.body);
  res.status(201).json({
    success: true,
    data: { event },
    message: 'Event created successfully',
  });
};

export const getPublicEvents = async (req, res) => {
  const result = await eventService.getPublicEvents(req.query);
  res.json({
    success: true,
    data: result,
  });
};

export const getPublicEvent = async (req, res) => {
  const event = await eventService.getPublicEventBySlug(req.params.slug);
  res.json({
    success: true,
    data: { event },
  });
};

export const getOrgEvents = async (req, res) => {
  const result = await eventService.getOrgEvents(req.user, req.query);
  res.json({
    success: true,
    data: result,
  });
};

export const getEvent = async (req, res) => {
  const event = await eventService.getEventById(req.params.id, req.user);
  res.json({
    success: true,
    data: { event },
  });
};

export const updateEvent = async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.user, req.body);
  res.json({
    success: true,
    data: { event },
    message: 'Event updated successfully',
  });
};

export const deleteEvent = async (req, res) => {
  const result = await eventService.deleteEvent(req.params.id, req.user);
  res.json({
    success: true,
    message: result.message,
  });
};

// Sessions
export const addSession = async (req, res) => {
  const session = await eventService.addSession(req.params.id, req.user, req.body);
  res.status(201).json({
    success: true,
    data: { session },
    message: 'Session added successfully',
  });
};

export const updateSession = async (req, res) => {
  const session = await eventService.updateSession(
    req.params.id,
    req.params.sessionId,
    req.user,
    req.body
  );
  res.json({
    success: true,
    data: { session },
    message: 'Session updated successfully',
  });
};

export const deleteSession = async (req, res) => {
  const result = await eventService.deleteSession(
    req.params.id,
    req.params.sessionId,
    req.user
  );
  res.json({
    success: true,
    message: result.message,
  });
};

// Team Members
export const getMembers = async (req, res) => {
  const members = await eventService.getEventMembers(req.params.id);
  res.json({
    success: true,
    data: { members },
  });
};

export const addMember = async (req, res) => {
  const member = await eventService.addEventMember(req.params.id, req.user, req.body);
  res.status(201).json({
    success: true,
    data: { member },
    message: 'Member invited successfully',
  });
};

export const removeMember = async (req, res) => {
  const result = await eventService.removeEventMember(req.params.id, req.params.memberId);
  res.json({
    success: true,
    message: result.message,
  });
};
