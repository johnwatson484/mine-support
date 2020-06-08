const Joi = require('@hapi/joi')
const getOktaConfig = require('./get-okta-config')

// Define config schema
const schema = Joi.object({
  port: Joi.number().default(3000),
  env: Joi.string().valid('development', 'test', 'production').default('development'),
  cacheName: Joi.string(),
  redisHost: Joi.string().default('localhost'),
  redisPort: Joi.number().default(6379),
  redisPartition: Joi.string().default('ffc-demo'),
  cookiePassword: Joi.string().required(),
  sessionTimeoutMinutes: Joi.number().default(30),
  staticCacheTimeoutMillis: Joi.number().default(15 * 60 * 1000),
  restClientTimeoutMillis: Joi.number().default(20000),
  oktaEnabled: Joi.boolean().default(true)
})

// Build config
const config = {
  port: process.env.PORT,
  env: process.env.NODE_ENV,
  cacheName: 'redisCache',
  redisPartition: process.env.REDIS_PARTITION,
  redisHost: process.env.REDIS_HOSTNAME,
  redisPort: process.env.REDIS_PORT,
  redisPassword: process.env.REDIS_PASSWORD,
  cookiePassword: process.env.COOKIE_PASSWORD,
  oktaEnabled: process.env.OKTA_ENABLED,
  sessionTimeoutMinutes: process.env.SESSION_TIMEOUT_IN_MINUTES,
  restClientTimeoutMillis: process.env.REST_CLIENT_TIMEOUT_IN_MILLIS,
  staticCacheTimeoutMillis: process.env.STATIC_CACHE_TIMEOUT_IN_MILLIS
}

// Validate config
const result = schema.validate(config, {
  abortEarly: false
})

// Throw if config is invalid
if (result.error) {
  throw new Error(`The server config is invalid. ${result.error.message}`)
}

// Use the Joi validated value
const value = result.value

// Add some helper props
value.isDev = (value.env === 'development' || value.env === 'test')
value.isTest = value.env === 'test'
value.isProd = value.env === 'production'
if (value.oktaEnabled) {
  value.okta = getOktaConfig()
}
module.exports = value
