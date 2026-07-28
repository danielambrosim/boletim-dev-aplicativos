// Cliente Supabase compartilhado. A anon key é pública por design — a
// segurança real vem das políticas de Row Level Security no banco
// (ver supabase/schema.sql). Nunca coloque a service_role key aqui.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://encwtfyvdtnlyiseiqic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY3d0Znl2ZHRubHlpc2VpcWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTE3NjIsImV4cCI6MjEwMDgyNzc2Mn0.0Fdvh-FnZPskByR08BNKHueNcXtkjd90PIXQxV9QojA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
