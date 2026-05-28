package com.vibely.backend.antibot.behavior;

import com.vibely.backend.antibot.dto.BehaviorSamplePayload;
import com.vibely.backend.antibot.dto.BehaviorTrackResponse;
import com.vibely.backend.antibot.persistence.AntiBotBehaviorSampleRepository;
import com.vibely.backend.antibot.persistence.entity.AntiBotBehaviorSampleEntity;
import com.vibely.backend.antibot.telemetry.AntiBotTelemetryPublisher;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BehaviorAnalysisService {

    private final AntiBotBehaviorSampleRepository repository;
    private final AntiBotTelemetryPublisher telemetryPublisher;

    public BehaviorAnalysisService(
        AntiBotBehaviorSampleRepository repository,
        AntiBotTelemetryPublisher telemetryPublisher
    ) {
        this.repository = repository;
        this.telemetryPublisher = telemetryPublisher;
    }

    public BehaviorTrackResponse track(String sessionId, String deviceHash, List<BehaviorSamplePayload> samples) {
        BehaviorTrackResponse response = analyze(samples);
        AntiBotBehaviorSampleEntity entity = new AntiBotBehaviorSampleEntity();
        entity.setSessionId(sessionId);
        entity.setDeviceHash(deviceHash);
        entity.setEntropyScore(response.entropyScore());
        entity.setLinearRatio(response.linearRatio());
        entity.setAvgSpeed(estimateAvgSpeed(samples));
        entity.setSampleCount(samples == null ? 0 : samples.size());
        repository.save(entity);

        telemetryPublisher.publish("behavior-events", Map.of(
            "event", "behavior_tracked",
            "sessionId", sessionId,
            "suspicious", response.suspicious()
        ));
        return response;
    }

    public BehaviorTrackResponse analyze(List<BehaviorSamplePayload> samples) {
        if (samples == null || samples.size() < 4) {
            return new BehaviorTrackResponse(0.5, 0.0, 0.55, false);
        }

        double totalDistance = 0;
        double straightDistance = 0;
        double linearSegments = 0;
        int segmentCount = 0;

        for (int i = 1; i < samples.size(); i++) {
            BehaviorSamplePayload prev = samples.get(i - 1);
            BehaviorSamplePayload curr = samples.get(i);
            double dx = curr.x() - prev.x();
            double dy = curr.y() - prev.y();
            double dist = Math.hypot(dx, dy);
            totalDistance += dist;

            if (i == 1) {
                straightDistance = dist;
            } else {
                BehaviorSamplePayload first = samples.get(0);
                straightDistance = Math.hypot(curr.x() - first.x(), curr.y() - first.y());
            }

            if (dist > 0.5) {
                segmentCount++;
                double angleChange = angleDelta(prev, curr, samples, i);
                if (angleChange < 0.05) {
                    linearSegments++;
                }
            }
        }

        double linearRatio = segmentCount == 0 ? 0 : linearSegments / segmentCount;
        double pathEfficiency = totalDistance <= 0 ? 0 : straightDistance / totalDistance;
        double entropyScore = clamp01(1.0 - linearRatio + (pathEfficiency * 0.35));
        double behaviorConfidence = clamp01(entropyScore * 0.85 + (1.0 - linearRatio) * 0.15);
        boolean suspicious = linearRatio > 0.82 || behaviorConfidence < 0.35;

        return new BehaviorTrackResponse(entropyScore, linearRatio, behaviorConfidence, suspicious);
    }

    private double estimateAvgSpeed(List<BehaviorSamplePayload> samples) {
        if (samples == null || samples.size() < 2) {
            return 0;
        }
        double total = 0;
        int count = 0;
        for (int i = 1; i < samples.size(); i++) {
            long dt = samples.get(i).timestampMs() - samples.get(i - 1).timestampMs();
            if (dt <= 0) {
                continue;
            }
            double dist = Math.hypot(
                samples.get(i).x() - samples.get(i - 1).x(),
                samples.get(i).y() - samples.get(i - 1).y()
            );
            total += dist / dt;
            count++;
        }
        return count == 0 ? 0 : total / count;
    }

    private double angleDelta(
        BehaviorSamplePayload prev,
        BehaviorSamplePayload curr,
        List<BehaviorSamplePayload> samples,
        int index
    ) {
        if (index < 2) {
            return 1.0;
        }
        BehaviorSamplePayload before = samples.get(index - 2);
        double v1x = prev.x() - before.x();
        double v1y = prev.y() - before.y();
        double v2x = curr.x() - prev.x();
        double v2y = curr.y() - prev.y();
        double mag1 = Math.hypot(v1x, v1y);
        double mag2 = Math.hypot(v2x, v2y);
        if (mag1 == 0 || mag2 == 0) {
            return 1.0;
        }
        double dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, dot)));
    }

    private double clamp01(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
