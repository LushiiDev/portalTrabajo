import { supabaseAdmin, hasServiceRole } from "../config/supabaseAdmin.js";

async function safeSelect(table, columns = "*") {
  const { data, error } = await supabaseAdmin.from(table).select(columns);
  if (error) throw error;
  return data || [];
}

async function listAuthUsers() {
  if (!hasServiceRole) return [];
  // With service role we can read auth users. Pagination could be needed for large datasets.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (error) throw error;
  return data?.users || [];
}

function normalizeStatus(status) {
  const v = String(status || "").toLowerCase();
  if (v.includes("susp") || v.includes("ban") || v.includes("block")) return "suspendido";
  if (v.includes("act") || v.includes("ok") || v.includes("enable")) return "activo";
  return v || "activo";
}

function statusFromAuth(authUser) {
  if (!authUser) return null;

  const bannedUntil = authUser.banned_until ? new Date(authUser.banned_until) : null;
  const isBanned = bannedUntil && !Number.isNaN(bannedUntil.getTime()) && bannedUntil.getTime() > Date.now();
  if (isBanned) return "suspendido";

  const fromMeta =
    authUser.user_metadata?.status ||
    authUser.app_metadata?.status ||
    authUser.user_metadata?.estado ||
    authUser.app_metadata?.estado;

  return fromMeta ? normalizeStatus(fromMeta) : null;
}

function isMissingProfilesStatusColumn(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("status") && message.includes("profiles") && message.includes("column");
}

async function setProfileStatusInAuthMetadata(authUserId, status) {
  if (!hasServiceRole) {
    const err = new Error(
      "No se puede suspender perfiles sin SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.statusCode = 400;
    throw err;
  }

  const normalized = normalizeStatus(status);

  // Actualizar la tabla profiles
  const { data: profileData, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .update({ status: normalized })
    .eq('id', authUserId)
    .select()
    .single();

  if (profileErr) throw profileErr;

  // También actualizar metadata para compatibilidad
  const { data: currentData, error: currentErr } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (currentErr) throw currentErr;

  const currentUser = currentData?.user;
  const userMetadata = { ...(currentUser?.user_metadata || {}), status: normalized };
  const appMetadata = { ...(currentUser?.app_metadata || {}), status: normalized };

  const { data: updatedData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });
  if (updateErr) throw updateErr;

  return {
    id: authUserId,
    status: normalized,
    source: "profiles_and_auth_metadata",
    profile: profileData,
    auth: updatedData?.user || null,
  };
}

export const getAdminUsers = async () => {
  const [profiles, companies, authUsers] = await Promise.all([
    safeSelect("profiles", "*"),
    safeSelect("companies", "*"),
    listAuthUsers(),
  ]);

  const authById = new Map(authUsers.map((u) => [u.id, u]));

  const companyByUserId = new Map();
  const orphanCompanies = [];

  companies.forEach((c) => {
    if (c.user_id) {
      if (!companyByUserId.has(c.user_id)) {
        companyByUserId.set(c.user_id, c);
      }
      return;
    }
    orphanCompanies.push(c);
  });

  const mergedUsers = profiles.map((p) => {
    const company = companyByUserId.get(p.id) || null;
    const auth = authById.get(p.id) || null;
    const authStatus = statusFromAuth(auth);

    if (company) {
      return {
        id: company.id,
        table: "companies",
        name:
          company.name ||
          company.nombre_empresa ||
          p.full_name ||
          p.name ||
          p.nombre ||
          "Empresa",
        email: auth?.email || company.email || p.email || null,
        role: "empleador",
        status: company.status || company.estado || authStatus || "activo",
        created_at: auth?.created_at || company.created_at || p.created_at || null,
        last_sign_in_at: auth?.last_sign_in_at || null,
        raw: { profile: p, company, auth },
      };
    }

    return {
      id: p.id,
      table: "profiles",
      name: p.full_name || p.name || p.nombre || "Sin nombre",
      email: auth?.email || p.email || null,
      role: String(p.role || "").toLowerCase() === "admin" ? "admin" : "candidato",
      status: p.status || p.estado || authStatus || "activo",
      created_at: auth?.created_at || p.created_at || null,
      last_sign_in_at: auth?.last_sign_in_at || null,
      raw: { profile: p, auth },
    };
  });

  // Keep companies without related profile as employador entries.
  const profileIds = new Set(profiles.map((p) => p.id));
  const extraCompanyUsers = companies
    .filter((c) => c.user_id && !profileIds.has(c.user_id))
    .map((c) => {
      const auth = authById.get(c.user_id) || null;
      return {
        id: c.id,
        table: "companies",
        name: c.name || c.nombre_empresa || "Empresa",
        email: auth?.email || c.email || null,
        role: "empleador",
        status: c.status || c.estado || "activo",
        created_at: auth?.created_at || c.created_at || null,
        last_sign_in_at: auth?.last_sign_in_at || null,
        raw: { company: c, auth },
      };
    });

  const extraOrphanCompanies = orphanCompanies.map((c) => ({
    id: c.id,
    table: "companies",
    name: c.name || c.nombre_empresa || "Empresa",
    email: c.email || null,
    role: "empleador",
    status: c.status || c.estado || "activo",
    created_at: c.created_at || null,
    last_sign_in_at: null,
    raw: { company: c, auth: null },
  }));

  return {
    hasServiceRole,
    users: [...mergedUsers, ...extraCompanyUsers, ...extraOrphanCompanies],
  };
};

export const setUserStatus = async (table, id, status) => {
  if (!["profiles", "companies"].includes(table)) {
    const err = new Error("Tabla inválida para usuarios.");
    err.statusCode = 400;
    throw err;
  }

  const normalized = normalizeStatus(status);

  if (table === "profiles") {
    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ status: normalized })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if (isMissingProfilesStatusColumn(error)) {
        return setProfileStatusInAuthMetadata(id, normalized);
      }
      throw error;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update({ status: normalized })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteUserRow = async (table, id) => {
  if (!["profiles", "companies"].includes(table)) {
    const err = new Error("Tabla inválida para usuarios.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin.from(table).delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteAuthUser = async (authUserId) => {
  if (!hasServiceRole) {
    const err = new Error("No hay SUPABASE_SERVICE_ROLE_KEY configurada para borrar usuarios de Auth.");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  if (error) throw error;
  return data;
};

