ALTER TABLE users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Demo seed users (password for both: password)
-- BCrypt hash: $2a$10$7EqJtq98hPqEX7fNZaFWoOHi1QK/Y/xFdVtOfvtTDHkJ/xZ4wNGGa
INSERT INTO users (username, email, password_hash, role, bio)
VALUES
    ('admin', 'admin@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi1QK/Y/xFdVtOfvtTDHkJ/xZ4wNGGa', 'ADMIN', 'Administrator account'),
    ('demo_user', 'user@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi1QK/Y/xFdVtOfvtTDHkJ/xZ4wNGGa', 'USER', 'Demo user account');
