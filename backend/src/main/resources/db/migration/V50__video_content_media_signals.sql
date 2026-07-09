ALTER TABLE video_content_understanding
    ADD COLUMN IF NOT EXISTS transcript_text TEXT,
    ADD COLUMN IF NOT EXISTS ocr_text TEXT;
