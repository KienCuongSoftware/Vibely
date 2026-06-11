CREATE TABLE user_notifications (
    id            BIGSERIAL PRIMARY KEY,
    recipient_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    actor_id      BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    type          VARCHAR(32)  NOT NULL,
    video_id      BIGINT       REFERENCES videos (id) ON DELETE CASCADE,
    comment_id    BIGINT       REFERENCES comments (id) ON DELETE CASCADE,
    preview       VARCHAR(500),
    read_at       TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_notifications_type CHECK (
        type IN ('FOLLOW', 'VIDEO_LIKE', 'COMMENT_LIKE', 'COMMENT_REPLY', 'MENTION')
    )
);

CREATE INDEX idx_user_notifications_recipient_created
    ON user_notifications (recipient_id, created_at DESC, id DESC);

CREATE INDEX idx_user_notifications_unread
    ON user_notifications (recipient_id)
    WHERE read_at IS NULL;

CREATE UNIQUE INDEX uk_user_notifications_video_like
    ON user_notifications (recipient_id, actor_id, video_id)
    WHERE type = 'VIDEO_LIKE' AND comment_id IS NULL;

CREATE UNIQUE INDEX uk_user_notifications_comment_like
    ON user_notifications (recipient_id, actor_id, comment_id)
    WHERE type = 'COMMENT_LIKE';

CREATE UNIQUE INDEX uk_user_notifications_follow
    ON user_notifications (recipient_id, actor_id)
    WHERE type = 'FOLLOW';

CREATE TABLE system_notifications (
    id         BIGSERIAL PRIMARY KEY,
    category   VARCHAR(32)  NOT NULL,
    badge      VARCHAR(16),
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500),
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_system_notifications_category CHECK (
        category IN ('live', 'transaction', 'system')
    )
);

CREATE INDEX idx_system_notifications_active_created
    ON system_notifications (active, created_at DESC, id DESC);

INSERT INTO system_notifications (category, badge, title, body, created_at)
VALUES
    (
        'live',
        'LIVE',
        'Bạn có đam mê bóng đá?',
        'Có cách mới để nhận thưởng — chạm để xem chi tiết.',
        CURRENT_TIMESTAMP
    ),
    (
        'live',
        'LIVE',
        'Khám phá cách phát LIVE trên Vibely',
        'Bắt đầu buổi phát trực tiếp đầu tiên và kết nối với người xem.',
        CURRENT_TIMESTAMP - INTERVAL '10 days'
    ),
    (
        'transaction',
        NULL,
        'Cập nhật chính sách giao dịch',
        'Xem lại điều khoản mới cho Vibely Shop và thanh toán trong app.',
        CURRENT_TIMESTAMP - INTERVAL '20 days'
    ),
    (
        'system',
        NULL,
        'Chào mừng đến Vibely',
        'Khám phá video mới và theo dõi nhà sáng tạo bạn yêu thích.',
        CURRENT_TIMESTAMP - INTERVAL '30 days'
    );
