import * as aiService from '../services/ai.service.js';

export const generateEventCopy = async (req, res) => {
  const result = await aiService.generateEventMarketingCopy(req.body);

  res.json({
    success: true,
    data: result,
  });
};

export const generateAgenda = async (req, res) => {
  const result = await aiService.generateStructuredAgenda(req.body);

  res.json({
    success: true,
    data: result,
  });
};

export const polishSpeakerBio = async (req, res) => {
  const result = await aiService.polishSpeakerBio(req.body);

  res.json({
    success: true,
    data: result,
  });
};

export const recommendSessions = async (req, res) => {
  const result = await aiService.recommendPersonalizedSchedule(req.body.eventId, {
    ...req.body,
    user: req.user,
  });

  res.json({
    success: true,
    data: result,
  });
};

export const copilotChat = async (req, res) => {
  const result = await aiService.runCopilotChat({
    ...req.body,
    user: req.user,
  });

  res.json({
    success: true,
    data: result,
  });
};
