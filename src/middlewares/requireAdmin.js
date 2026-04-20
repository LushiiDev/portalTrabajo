import { supabase } from "../config/supabase.js";
import { hasServiceRole, supabaseAdmin } from "../config/supabaseAdmin.js";

function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : String(header);
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function isAdminFromProfile(userId) {
  if (!hasServiceRole || !userId) return false;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, tipo_cuenta")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;

  const role = String(data.role || "").trim().toLowerCase();
  const tipoCuenta = String(data.tipo_cuenta || "").trim().toLowerCase();

  return (
    role === "admin" ||
    tipoCuenta === "admin"
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
    const adminFromProfile = await isAdminFromProfile(user.id);

    if (!adminFromProfile) {
      return res
        .status(403)
        .json({
          status: "error",
          message:
            "Acceso denegado: se requiere rol admin.",
        });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
