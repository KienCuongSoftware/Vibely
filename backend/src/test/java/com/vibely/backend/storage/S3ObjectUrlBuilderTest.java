package com.vibely.backend.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class S3ObjectUrlBuilderTest {

    private S3ObjectUrlBuilder builder;

    @BeforeEach
    void setUp() {
        S3Properties properties = new S3Properties();
        properties.setBucket("vibely-dev");
        properties.setRegion("ap-southeast-2");
        properties.setPublicUrlBase("https://cdn.example.com");
        builder = new S3ObjectUrlBuilder(properties);
    }

    @Test
    void resolveKeyLenientFromPresignedStyleUrl() {
        assertThat(builder.resolveKeyLenient(
            "https://vibely-dev.s3.ap-southeast-2.amazonaws.com/thumbnails/42/cover.jpg?X-Amz-Algorithm=AWS4"
        )).contains("thumbnails/42/cover.jpg");
    }

    @Test
    void resolveKeyLenientFromRawObjectKey() {
        assertThat(builder.resolveKeyLenient("thumbnails/42/cover.jpg"))
            .contains("thumbnails/42/cover.jpg");
    }
}
