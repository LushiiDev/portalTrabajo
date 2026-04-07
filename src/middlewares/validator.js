import {body, validationResult} from 'express-validator';

export const runValidations = (validations) => {
    return async (req, res, next) => {
        for(const validation of validations) {
            await validation.run(req)
        }

        const errors = validationResult(req);

        if(errors.isEmpty()) {
            return next();
        }
        
        return res.status(400).json({
            status: 'error',
            errors: errors.array()
        })
    }
}

export const createJobValidator = [
    body('title').notEmpty().withMessage('El titulo es obligatorio!!!'),
    body('description').notEmpty().withMessage('La descripción es obligatoria!!!'),
    body('contractType').notEmpty().withMessage('El tipo de contrato es obligatorio!!!'),
    body('experienceLevel').notEmpty().withMessage('El el nivel de experiencia es obligatorio!!!')
]