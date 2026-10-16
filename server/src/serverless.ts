import { composeApp } from './compose.js';
import { loadConfig } from './config/env.js';
import { consoleLogger } from './logger.js';

// Vercel Functions entry: the platform owns the HTTP server and the instance lifecycle, so the app
// is exported rather than listened on, and there is no startup work. Migrations run once per deploy
// (`npm run migrate`, the service's build command), not on every cold start.
export default composeApp(loadConfig(), consoleLogger).app;
