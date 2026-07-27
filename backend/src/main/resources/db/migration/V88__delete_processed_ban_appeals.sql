-- Remove already-processed ban appeals from the admin queue.
-- Going forward, APPROVED/REJECTED appeals are deleted after the decision email is sent.

DELETE FROM ban_appeals
WHERE status IN ('APPROVED', 'REJECTED');
