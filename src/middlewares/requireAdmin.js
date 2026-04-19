import { supabase } from "../config/supabase.js";

function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : String(header);
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function isAdminFromMeta(meta) {
  if (!meta) return false;
  return (
    meta.role === "admin" ||
    meta.tipo_cuenta === "admin" ||
    meta.is_admin === true
  );
}

export const requireAdmin = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({
          status: "error",
          message: "Falta token de autorización (Bearer).",
        });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res
        .status(401)
        .json({ status: "error", message: "Token inválido o expirado." });
    }

    const user = data.user;
    const meta = user.user_metadata || {};
    if (!isAdminFromMeta(meta)) {
      return res
        .status(403)
        .json({
          status: "error",
          message: "Acceso denegado: se requiere rol admin.",
        });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
