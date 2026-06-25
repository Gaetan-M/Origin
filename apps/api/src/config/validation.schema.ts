import * as Joi from 'joi';

// Reject hard-coded dev secrets in production. The list captures the exact
// strings that have ever been shipped as defaults so a copy-pasted .env from
// the example file fails fast at boot.
const FORBIDDEN_PROD_SECRETS = [
  'dev-access-secret',
  'dev-access-secret-change-in-production',
  'dev-refresh-secret',
  'dev-refresh-secret-change-in-production',
  'fallback-secret',
];

const jwtSecret = Joi.string()
  .min(32)
  .required()
  .when('NODE_ENV', {
    is: 'production',
    then: Joi.string().invalid(...FORBIDDEN_PROD_SECRETS),
  });

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: jwtSecret,
  JWT_REFRESH_SECRET: jwtSecret,
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('90d'),
  OTP_EXPIRY_MINUTES: Joi.number().default(5),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  AWS_REGION: Joi.string().default('af-south-1'),
  AWS_ENDPOINT_URL: Joi.string().optional(),
  AWS_KMS_KEY_ID: Joi.string().optional(),
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('debug'),
  // Observability: empty/unset disables Sentry (init is a no-op without a DSN).
  SENTRY_DSN: Joi.string().allow('').optional(),
  SENTRY_RELEASE: Joi.string().allow('').optional(),
  TWILIO_ACCOUNT_SID: Joi.string().allow('').optional(),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
  TWILIO_PHONE_NUMBER: Joi.string().allow('').optional(),
  TWILIO_WHATSAPP_FROM: Joi.string().allow('').optional(),
  // Default false: never log OTP codes by default. Dev opt-in via .env.
  OTP_LOG_IN_DEV: Joi.boolean().truthy('true').falsy('false').default(false),
  WEB_APP_URL: Joi.string().uri().default('http://localhost:3001'),
  // Required in production — wildcard CORS with credentials is dangerous.
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3001')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required().disallow('*'),
    }),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  TRUST_PROXY: Joi.alternatives()
    .try(Joi.number(), Joi.boolean(), Joi.string())
    .default(0),
});
