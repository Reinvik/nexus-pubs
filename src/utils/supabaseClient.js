import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0enB6Z3d5anB0Ym5pcHZ5amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDY4MDAsImV4cCI6MjA4MTQyMjgwMH0.An72d0glXpf6RZR5nwQ9OnLeU00loVqkZkNjUJhICA4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'punto_nexus' }
});
