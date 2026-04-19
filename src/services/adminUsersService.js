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

  const mergedProfiles = profiles.map((p) => {
    const auth = authById.get(p.id) || null;
    return {
      id: p.id,
      table: "profiles",
      name: p.full_name || p.name || p.nombre || "Sin nombre",
      email: auth?.email || p.email || null,
      role: p.role || auth?.user_metadata?.role || auth?.user_metadata?.tipo_cuenta || "candidato",
      status: p.status || p.estado || "activo",
      created_at: auth?.created_at || p.created_at || null,
      last_sign_in_at: auth?.last_sign_in_at || null,
      raw: { profile: p, auth },
    };
  });

  const mergedCompanies = companies.map((c) => {
    const auth = c.user_id ? authById.get(c.user_id) : null;
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

  return {
    hasServiceRole,
    users: [...mergedProfiles, ...mergedCompanies],
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

