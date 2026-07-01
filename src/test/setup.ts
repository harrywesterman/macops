process.env.AUTH_MOCK_ENABLED ??= "true";
process.env.INTEGRATION_MODE ??= "mock";
process.env.SESSION_SECRET ??= "test-session-secret-change-me";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "file:./prisma/test.db";
