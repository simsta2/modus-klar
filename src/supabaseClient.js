import { createClient } from '@supabase/supabase-js'

// HIER DEINE WERTE EINFÜGEN!
const supabaseUrl = 'https://vaykqpkdqxllfzlymthb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheWtxcGtkcXhsbGZ6bHltdGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NzU0MjIsImV4cCI6MjA2OTU1MTQyMn0.PE50DsgFl8f8XSzUbPHx_-epLVgnzlgH-JHOIHo3j98'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
