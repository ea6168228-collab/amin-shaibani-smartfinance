import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import aiRoutes from './routes/ai.routes';
import backupRoutes from './routes/backup.routes';
import licenseRoutes from './routes/license.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '10.5', timestamp: new Date().toISOString() });
});

// Register Hardened Phase 10.5 Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/license', licenseRoutes);

export default app;
