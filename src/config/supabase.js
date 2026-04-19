import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;

//const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Falta SUPABASE_URL en variables de entorno");
}

if (!supabaseKey) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno. El backend necesita esta key para operaciones de Storage y escritura sin errores de RLS.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
