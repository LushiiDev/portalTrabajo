import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

// Prefer Service Role for admin endpoints (server-only). Fallback to anon for local/dev
// but note that RLS may block operations and it's not suitable for real admin tasks.
const key = serviceRoleKey || anonKey;

export const hasServiceRole = Boolean(serviceRoleKey);
export const supabaseAdmin = createClient(supabaseUrl, key);
