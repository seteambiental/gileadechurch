-- Reset Adrielly's password to first 6 digits of CPF: 049274
UPDATE auth.users 
SET encrypted_password = extensions.crypt('049274', extensions.gen_salt('bf'))
WHERE id = '2a2e79a1-9eff-4f1b-8f83-e86afa3d2beb';
