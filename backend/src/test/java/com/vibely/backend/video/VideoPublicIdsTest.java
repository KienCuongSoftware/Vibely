package com.vibely.backend.video;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.vibely.backend.common.BadRequestException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class VideoPublicIdsTest {

    @Test
    void parseAcceptsUuidV7String() {
        UUID id = UUID.fromString("018fc2c7-f2e9-7a41-b9d7-0123456789ab");
        assertThat(VideoPublicIds.parse(id.toString())).isEqualTo(id);
    }

    @Test
    void parseRejectsNumericLegacyIds() {
        assertThatThrownBy(() -> VideoPublicIds.parse("123"))
            .isInstanceOf(BadRequestException.class);
    }

    @Test
    void parseRejectsMalformedValues() {
        assertThatThrownBy(() -> VideoPublicIds.parse("not-a-uuid"))
            .isInstanceOf(BadRequestException.class);
    }
}
