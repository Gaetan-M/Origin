// Joi (validation.schema.ts) is the source of truth for which env vars are
// required and what their defaults are. The function below should NOT supply
// fallbacks for security-sensitive secrets — the validator will already have
// rejected invalid configs before this runs.
export default (): Record<string, unknown> => ({
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '90d',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  aws: {
    region: process.env.AWS_REGION || 'af-south-1',
    endpointUrl: process.env.AWS_ENDPOINT_URL,
    kmsKeyId: process.env.AWS_KMS_KEY_ID,
  },
  s3: {
    bucketPhotos: process.env.S3_BUCKET_PHOTOS || 'genealogie-photos-public',
    bucketDocuments: process.env.S3_BUCKET_DOCUMENTS || 'genealogie-documents-private',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
    logOtpInDev: (process.env.OTP_LOG_IN_DEV || 'false').toLowerCase() === 'true',
  },
  webAppUrl: process.env.WEB_APP_URL || 'http://localhost:3001',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  swaggerEnabled: (process.env.SWAGGER_ENABLED || 'false').toLowerCase() === 'true',
  trustProxy: process.env.TRUST_PROXY ?? 0,
});
