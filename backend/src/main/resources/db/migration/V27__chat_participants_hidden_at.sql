ALTER TABLE chat_conversation_participants
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;
