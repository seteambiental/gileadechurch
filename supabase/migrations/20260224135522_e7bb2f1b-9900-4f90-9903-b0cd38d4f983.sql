-- Reset password for Adrielly to first 6 digits of CPF (049274)
-- Using Supabase's built-in password update
SELECT extensions.crypt('049274', extensions.gen_salt('bf'));
