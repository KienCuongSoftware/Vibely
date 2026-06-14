package com.vibely.backend.processing;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
