package com.vibely.backend.processing.audio;

import org.springframework.stereotype.Component;

/**
 * Extra EQ for phone speakers / earbuds — tames unusable sub-bass, adds vocal presence and perceived warmth.
 */
@Component
public class MobileSpeakerOptimizer {

    /**
     * Filter segments applied before dynamics / loudnorm (comma-separated, no trailing comma).
     */
    public String mobileEqSegments(AudioMasteringProfile profile) {
        return switch (profile) {
            case SPEECH -> "equalizer=f=120:t=q:w=1.5:g=-3,equalizer=f=2800:t=q:w=1:g=2";
            case MUSIC -> "equalizer=f=55:t=q:w=1:g=-4,equalizer=f=180:t=q:w=1:g=1.5";
            case CINEMATIC -> "equalizer=f=45:t=q:w=1:g=-2,equalizer=f=3000:t=q:w=1:g=1";
            case DEFAULT -> "equalizer=f=60:t=q:w=1:g=-3,equalizer=f=220:t=q:w=1:g=1.5";
        };
    }
}
