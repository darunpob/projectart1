import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/database.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
const app = createApp({ db, jwtSecret: config.jwtSecret, clientDistPath: config.clientDistPath });

const server = app.listen(config.port, () => {
  console.log(`Spendwise API listening on http://localhost:${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
