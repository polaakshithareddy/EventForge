import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      mongodb: dbStates[mongoose.connection.readyState] || 'unknown',
    },
    message: 'EventForge API is running',
  });
});

router.all('/seed', async (req, res) => {
  const secret = req.query.secret || req.body?.secret || req.headers['x-seed-secret'];
  if (secret !== 'EventForge2026!' && secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid or missing seed secret' });
  }

  try {
    const { runSeed } = await import('../seed/index.js');
    const result = await runSeed({ standalone: false });
    return res.json({
      success: true,
      message: 'EventForge database successfully seeded with demo data!',
      data: result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
