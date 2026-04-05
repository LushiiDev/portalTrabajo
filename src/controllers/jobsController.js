import * as jobsService from '../services/jobsService.js'

export const getObtenerTodosLosTrabajos = async(req, res, next) => {
    try{
        const resultTrabajos = await jobsService.getAllJobs();
        res.json(resultTrabajos)
    } catch (err) {
        return next(err);
    }
};