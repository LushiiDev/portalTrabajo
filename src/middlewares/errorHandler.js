export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const rawStatus = err.statusCode ?? err.status;
  const parsedStatus = Number(rawStatus);
  const statusCode = Number.isInteger(parsedStatus) && parsedStatus >= 100 && parsedStatus <= 599
    ? parsedStatus
    : 500;
  const message = err.message || "Error interno del servidor";

  return res.status(statusCode).json({
    status: "error",
    message,
    code: err.code || null,
    details: err.details || null
  });
};