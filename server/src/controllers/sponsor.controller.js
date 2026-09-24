import * as sponsorService from '../services/sponsor.service.js';

export const createSponsor = async (req, res) => {
  const sponsor = await sponsorService.createSponsor(
    req.params.eventId,
    req.user,
    req.body,
    req.file
  );

  res.status(201).json({
    success: true,
    data: { sponsor },
    message: 'Sponsor added successfully',
  });
};

export const getEventSponsors = async (req, res) => {
  const sponsors = await sponsorService.getEventSponsors(req.params.eventId, req.query);

  res.json({
    success: true,
    data: {
      sponsors,
      total: sponsors.length,
    },
  });
};

export const getEventSponsorsByTier = async (req, res) => {
  const data = await sponsorService.getEventSponsorsByTier(req.params.eventId);

  res.json({
    success: true,
    data,
  });
};

export const getSponsorById = async (req, res) => {
  const sponsor = await sponsorService.getSponsorById(req.params.id);

  res.json({
    success: true,
    data: { sponsor },
  });
};

export const updateSponsor = async (req, res) => {
  const sponsor = await sponsorService.updateSponsor(
    req.params.id,
    req.user,
    req.body,
    req.file
  );

  res.json({
    success: true,
    data: { sponsor },
    message: 'Sponsor updated successfully',
  });
};

export const deleteSponsor = async (req, res) => {
  const result = await sponsorService.deleteSponsor(req.params.id, req.user);

  res.json({
    success: true,
    message: result.message,
  });
};

export const inviteRepresentative = async (req, res) => {
  const result = await sponsorService.inviteSponsorRepresentative(
    req.params.id,
    req.user,
    req.body
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Sponsor representative invitation sent successfully',
  });
};

// Authenticated private file delivery (User-approved change #7)
export const getContractDocument = async (req, res) => {
  const fileInfo = await sponsorService.getSponsorContractFile(req.params.id, req.user);

  res.setHeader('Content-Type', fileInfo.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`
  );

  res.sendFile(fileInfo.filePath);
};
