import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sufaeygomagendffczdf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZmFleWdvbWFnZW5kZmZjemRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYzMDgsImV4cCI6MjA5NjE2MjMwOH0.JMOkmvwgbrtuhtMfh_pttBUYyn4fURXDws3qhoT01EY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
