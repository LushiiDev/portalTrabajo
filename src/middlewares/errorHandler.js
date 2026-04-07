export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor";

  return res.status(statusCode).json({
    status: "error",
    message,
    code: err.code || null,
    details: err.details || null
  });
};