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
    body('company_id').isUUID().withMessage('El company_id es obligatorio y debe ser UUID'),
    body('title').notEmpty().withMessage('El titulo es obligatorio!!!'),
    body('description').isLength({ min: 100 }).withMessage('La descripción debe tener al menos 100 caracteres'),
    body('location').notEmpty().withMessage('La ubicación es obligatoria!!!'),
    body('salaryMin').isInt({ min: 0 }).withMessage('El salario mínimo debe ser un entero >= 0'),
    body('salaryMax').isInt({ min: 0 }).withMessage('El salario máximo debe ser un entero >= 0'),
    body('salaryMax').custom((value, { req }) => Number(value) >= Number(req.body.salaryMin)).withMessage('El salario máximo debe ser mayor o igual al salario mínimo'),
    body('contractType').notEmpty().withMessage('El tipo de contrato es obligatorio!!!'),
    body('workMode').isIn(['Presencial', 'Hibrido', 'Remoto']).withMessage('La modalidad debe ser Presencial, Hibrido o Remoto'),
    body('experienceLevel').notEmpty().withMessage('El el nivel de experiencia es obligatorio!!!')
]