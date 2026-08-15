const Joi = require('joi');

const authSchemas = {
  requestOTP: Joi.object({
    phoneNumber: Joi.string().pattern(/^\+967[0-9]{9}$/).required().messages({
      'string.pattern.base': 'Phone number must be a valid Yemen number starting with +967',
      'any.required': 'Phone number is required'
    })
  }),
  verifyOTP: Joi.object({
    phoneNumber: Joi.string().pattern(/^\+967[0-9]{9}$/).required(),
    otpCode: Joi.string().length(4).pattern(/^[0-9]+$/).required().messages({
      'string.length': 'OTP must be exactly 4 digits',
      'string.pattern.base': 'OTP must contain only numbers'
    })
  }),
  verifyFirebaseToken: Joi.object({
    idToken: Joi.string().required().messages({
      'any.required': 'Firebase ID Token is required'
    })
  })
};

const productSchemas = {
  createProduct: Joi.object({
    categoryId: Joi.string().uuid().required(),
    title: Joi.string().min(2).max(150).required(),
    description: Joi.string().min(3).max(2000).allow('', null).optional(),
    price: Joi.number().positive().required(),
    currency: Joi.string().valid('YER', 'SAR', 'USD').optional(),
    unitOfSale: Joi.string().required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({ success: false, message: errorMessage });
    }
    next();
  };
};

module.exports = {
  authSchemas,
  productSchemas,
  validate
};
