import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ktdxhsstrgwciqkvprph.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZHhoc3N0cmd3Y2lxa3ZwcnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDcwMzUsImV4cCI6MjA5MTMyMzAzNX0.lA3aQK2OlZOXhFNtI2SF5gsIup9I6bdKpklYnGGAUfs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)