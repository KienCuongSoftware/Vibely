package com.vibely.backend.storage;

import com.vibely.backend.common.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class S3OwnedMediaValidatorTest {

    private S3OwnedMediaValidator validator;

    @BeforeEach
    void setUp() {
        S3Properties properties = new S3Properties();
        properties.setBucket("vibely-dev");
        properties.setRegion("ap-southeast-1");
        properties.setPublicUrlBase("https://cdn.example.com");
        properties.setEnabled(true);
        validator = new S3OwnedMediaValidator(properties, new S3ObjectUrlBuilder(properties));
    }

    @Test
    void acceptsOwnedUploadKey() {
        assertThatCode(() -> validator.requireOwnedUpload(
            "https://cdn.example.com/uploads/42/video.mp4",
            42L
        )).doesNotThrowAnyException();
    }

    @Test
    void rejectsForeignUploadKey() {
        assertThatThrownBy(() -> validator.requireOwnedUpload(
            "https://cdn.example.com/uploads/99/video.mp4",
            42L
        )).isInstanceOf(BadRequestException.class);
    }

    @Test
    void acceptsOwnedThumbnailKey() {
        assertThatCode(() -> validator.requireOwnedThumbnail(
            "https://cdn.example.com/thumbnails/7/cover.jpg",
            7L
        )).doesNotThrowAnyException();
    }

    @Test
    void acceptsOwnedAudioKey() {
        assertThatCode(() -> validator.requireOwnedAudio(
            "https://cdn.example.com/audios/42/track.mp3",
            42L
        )).doesNotThrowAnyException();
    }

    @Test
    void rejectsForeignAudioKey() {
        assertThatThrownBy(() -> validator.requireOwnedAudio(
            "https://cdn.example.com/audios/99/track.mp3",
            42L
        )).isInstanceOf(BadRequestException.class);
    }
}
