-- Deactivate seeded placeholder system notifications (demo content, not real).
UPDATE system_notifications
SET active = FALSE
WHERE title IN (
    'Bạn có đam mê bóng đá?',
    'Khám phá cách phát LIVE trên Vibely',
    'Cập nhật chính sách giao dịch',
    'Chào mừng đến Vibely'
);
