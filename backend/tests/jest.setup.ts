/**
 * Runs before any test module is imported, so `src/config/env.ts` (which throws
 * on missing variables) can be loaded safely.
 *
 * These are throwaway values for an isolated test process — no database is ever
 * contacted and no third-party service is called.
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // 'silent' is not in the logger's LEVELS list, so all levels are suppressed
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mend_test_unused';
process.env.PORT = '0';
process.env.JWT_SECRET = 'test-jwt-secret-not-a-real-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-not-a-real-secret';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.CLIENT_ID = 'test-client-id';
process.env.CLIENT_SECRET = 'test-client-secret';
process.env.CLIENT_VERSION = '1';
process.env.PAYMENT_SUCCESS_REDIRECT_URL = 'https://example.test/return';
// `GoogleCloudStorageProvider` resolves its bucket at import time (task.controller),
// so a placeholder is required for the app module graph to load. No upload is
// ever performed by these tests.
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCP_BUCKET_NAME = 'test-bucket';
process.env.GCP_SA_KEY = '';
