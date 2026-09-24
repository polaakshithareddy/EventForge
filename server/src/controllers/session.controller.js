import * as sessionService from '../services/session.service.js';

export const createSession = async (req, res) => {
  const session = await sessionService.createSession(
    req.params.eventId,
    req.user,
    req.body
  );
  res.status(201).json({
    success: true,
    data: { session },
    message: 'Session created successfully',
  });
};

export const getEventSessions = async (req, res) => {
  const sessions = await sessionService.getEventSessions(
    req.params.eventId,
    req.query
  );
  res.json({
    success: true,
    data: { sessions },
  });
};

export const getSession = async (req, res) => {
  const session = await sessionService.getSessionById(req.params.id);
  res.json({
    success: true,
    data: { session },
  });
};

export const updateSession = async (req, res) => {
  const session = await sessionService.updateSession(
    req.params.id,
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
  const result = await sessionService.deleteSession(req.params.id, req.user);
  res.json({
    success: true,
    message: result.message,
  });
};

export const getSchedule = async (req, res) => {
  const schedule = await sessionService.getEventSchedule(req.params.eventId);
  res.json({
    success: true,
    data: schedule,
  });
};

export const getSpeakers = async (req, res) => {
  const speakers = await sessionService.getEventSpeakers(req.params.eventId);
  res.json({
    success: true,
    data: { speakers },
  });
};

export const inviteSpeaker = async (req, res) => {
  const speaker = await sessionService.inviteSpeaker(
    req.params.eventId,
    req.user,
    req.body
  );
  res.status(201).json({
    success: true,
    data: { speaker },
    message: 'Speaker invited successfully',
  });
};

export const updateSpeakerProfile = async (req, res) => {
  const speaker = await sessionService.updateSpeakerProfile(
    req.params.eventId,
    req.params.speakerId,
    req.user,
    req.body
  );
  res.json({
    success: true,
    data: { speaker },
    message: 'Speaker profile updated successfully',
  });
};
