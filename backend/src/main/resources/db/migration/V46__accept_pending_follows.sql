-- Private accounts use instant follow; legacy pending rows should grant access immediately.
UPDATE follows SET status = 'ACCEPTED' WHERE status = 'PENDING';
