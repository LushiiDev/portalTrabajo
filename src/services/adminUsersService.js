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
        status: company.status || company.estado || "activo",
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
      status: p.status || p.estado || "activo",
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

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ status })
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

