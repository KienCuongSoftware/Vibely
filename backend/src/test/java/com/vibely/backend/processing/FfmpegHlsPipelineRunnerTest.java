package com.vibely.backend.processing;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class FfmpegHlsPipelineRunnerTest {

    @Test
    void evenScaleDimensions_portrait576x1024_to720p_widthIsEven() {
        int[] scaled = FfmpegHlsPipelineRunner.evenScaleDimensions(576, 1024, 720);
        assertArrayEquals(new int[] { 404, 720 }, scaled);
    }

    @Test
    void evenScaleDimensions_portrait576x1024_to540p() {
        int[] scaled = FfmpegHlsPipelineRunner.evenScaleDimensions(576, 1024, 540);
        assertArrayEquals(new int[] { 304, 540 }, scaled);
    }

    @Test
    void evenScaleDimensions_landscape1024x576_to540p() {
        int[] scaled = FfmpegHlsPipelineRunner.evenScaleDimensions(1024, 576, 540);
        assertArrayEquals(new int[] { 960, 540 }, scaled);
    }

    @Test
    void evenScaleDimensions_doesNotUpscaleSmallSource() {
        int[] scaled = FfmpegHlsPipelineRunner.evenScaleDimensions(360, 640, 720);
        assertArrayEquals(new int[] { 360, 640 }, scaled);
    }

    @Test
    void evenScaleDimensions_bothDimensionsAreEven() {
        int[] scaled = FfmpegHlsPipelineRunner.evenScaleDimensions(405, 720, 720);
        assertEquals(0, scaled[0] % 2);
        assertEquals(0, scaled[1] % 2);
    }

    @Test
    void planHlsRenditions_720pIncludesLowerLadder() {
        assertEquals(
            List.of(720, 540, 480, 360, 240, 144),
            FfmpegHlsPipelineRunner.planHlsTargetHeights(720)
        );
    }

    @Test
    void planHlsRenditions_1080pIncludes720AndLower() {
        assertEquals(
            List.of(1080, 720, 540, 480, 360, 240, 144),
            FfmpegHlsPipelineRunner.planHlsTargetHeights(1080)
        );
    }

    @Test
    void planHlsRenditions_540pDoesNotUpscaleTo720() {
        assertEquals(
            List.of(540, 480, 360, 240, 144),
            FfmpegHlsPipelineRunner.planHlsTargetHeights(540)
        );
    }

    @Test
    void planHlsRenditions_576pKeepsSourceWithoutFake720() {
        assertEquals(
            List.of(576, 480, 360, 240, 144),
            FfmpegHlsPipelineRunner.planHlsTargetHeights(576)
        );
    }

    @Test
    void planHlsRenditions_4kIncludesFullLadder() {
        assertEquals(
            List.of(2160, 1440, 1080, 720, 540, 480, 360, 240, 144),
            FfmpegHlsPipelineRunner.planHlsTargetHeights(2160)
        );
    }

    @Test
    void maxVideoDurationIsSixtyMinutes() {
        assertEquals(3600, FfmpegHlsPipelineRunner.MAX_VIDEO_DURATION_SECONDS);
    }
}
