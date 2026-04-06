import * as companiesService from '../services/companiesService.js';

export const getObtenerTodasLasEmpresas = async (req, res, next) => {
  try {
    const result = await companiesService.getAllCompanies();
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const getObtenerEmpresaPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await companiesService.getCompanyById(id);
    res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const postCrearEmpresa = async (req, res, next) => {
  try {
    const {
      user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    } = req.body;

    const newCompany = await companiesService.createCompany(
      user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    );

    res.status(201).json(newCompany);
  } catch (err) {
    return next(err);
  }
};

export const putActualizarEmpresa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    } = req.body;

    const updatedCompany = await companiesService.updateCompany(
      id, user_id, name, description, logo_url,
      website, sector, size, founded_year,
      location, linkedin_url, facebook_url
    );

    res.status(200).json(updatedCompany);
  } catch (err) {
    return next(err);
  }
};

export const deleteEliminarEmpresa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await companiesService.deleteCompany(id);
    res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};