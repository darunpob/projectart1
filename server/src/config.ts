export interface AppConfig {
  port: number;
  databasePath: string;
  jwtSecret: string;
  clientDistPath: string | null;
}

const DEV_JWT_SECRET = 'spendwise-dev-only-secret';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET ?? (isProduction ? undefined : DEV_JWT_SECRET);
  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
  return {
    port: Number(env.PORT ?? 4000),
    databasePath: env.DATABASE_PATH ?? 'spendwise.db',
    jwtSecret,
    clientDistPath: env.CLIENT_DIST ?? null,
  };
}
