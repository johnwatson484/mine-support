const Joi = require('@hapi/joi')

module.exports = Joi.any().valid('home', 'business').required()
