
    import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = 'https://xhkzriwtqyyjcuhgypdn.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa3pyaXd0cXl5amN1aGd5cGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0Mzg3OTcsImV4cCI6MjA2MTAxNDc5N30.pj9uKLQs5opfm-geN3sF8TMf7uPFXtbRc0Y8f95CGAw';

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  