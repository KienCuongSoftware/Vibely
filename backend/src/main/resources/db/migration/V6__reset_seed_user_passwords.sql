-- Ensure existing seed accounts use the known demo password: password
UPDATE users
SET password_hash = '$2a$10$nN9PVKh9/xGY9zRqnOUAduP/i11i2VRKaVup2.VhSUwt0MP23ojF6'
WHERE email IN ('admin@gmail.com', 'user@gmail.com');
