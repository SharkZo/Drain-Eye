import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mameoekicqcubqkindov.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbWVvZWtpY3FjdWJxa2luZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjc3OTcsImV4cCI6MjA5Nzk0Mzc5N30.eF0pQaUpuPCn63XUv6xdi2FEZAmnclXBJPlJ0vq3heE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)