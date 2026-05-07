import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = 'https://lttajvnvbnmyowvwrunw.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dGFqdm52Ym5teW93dndydW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTk1MTQsImV4cCI6MjA5MzczNTUxNH0.oG8iO96DftAmb1hLuGSNscyG2647TbncbeuN98clKus'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
