UPDATE users
SET
    username = 'admin.vibely',
    display_name = 'Admin Vibely',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@gmail.com';

UPDATE users
SET
    username = 'vibely.demo',
    display_name = 'Vibely Demo',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@gmail.com';
