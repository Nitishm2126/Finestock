import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`[Fine Stock API] Server running on http://localhost:${PORT}`);
  console.log(`[Fine Stock API] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Fine Stock API] Allowed Origin: ${config.frontendUrl}`);
});

export default app;
export { server };
