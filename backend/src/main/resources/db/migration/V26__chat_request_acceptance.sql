ALTER TABLE chat_conversations
    ADD COLUMN IF NOT EXISTS request_accepted_at TIMESTAMP;
