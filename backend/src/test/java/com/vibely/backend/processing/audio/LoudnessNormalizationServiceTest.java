package com.vibely.backend.processing.audio;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LoudnessNormalizationServiceTest {

    @Test
    void parsesLoudnormJsonFromFfmpegLog() {
        String log = """
            [Parsed_loudnorm_0 @ 0x0] {
            	"input_i" : "-18.41",
            	"input_tp" : "-2.12",
            	"input_lra" : "6.20",
            	"input_thresh" : "-28.50",
            	"output_i" : "-12.00",
            	"output_tp" : "-1.50",
            	"output_lra" : "5.80",
            	"output_thresh" : "-22.10",
            	"normalization_type" : "dynamic",
            	"target_offset" : "0.41"
            }
            """;
        var measured = LoudnessNormalizationService.parseMeasurement(log);
        assertThat(measured).isPresent();
        assertThat(measured.get().inputI()).isEqualTo(-18.41);
        assertThat(measured.get().targetOffset()).isEqualTo(0.41);
    }
}
