ALTER TABLE chat_conversation_participants
    ADD COLUMN pinned_at TIMESTAMP;

CREATE INDEX idx_chat_participants_user_pinned
    ON chat_conversation_participants (user_id, pinned_at DESC NULLS LAST)
    WHERE hidden_at IS NULL;
