-- Allow deleting users that still have linked ban appeals.
ALTER TABLE ban_appeals DROP CONSTRAINT IF EXISTS ban_appeals_user_id_fkey;

ALTER TABLE ban_appeals
    ADD CONSTRAINT ban_appeals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
