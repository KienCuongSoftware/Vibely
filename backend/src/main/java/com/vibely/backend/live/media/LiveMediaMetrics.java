package com.vibely.backend.live.media;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/** Media counters exported through the existing Micrometer/Prometheus setup (no-op without a registry). */
@Component
public class LiveMediaMetrics {

    private final AtomicInteger activeStreams = new AtomicInteger();
    private final Counter publishFailures;
    private final Counter viewerConnections;
    private final Counter reconnects;

    public LiveMediaMetrics(ObjectProvider<MeterRegistry> registryProvider) {
        MeterRegistry registry = registryProvider.getIfAvailable();
        if (registry == null) {
            publishFailures = null;
            viewerConnections = null;
            reconnects = null;
            return;
        }
        Gauge.builder("live.active", activeStreams, AtomicInteger::get)
            .description("LIVE broadcasts whose host stream is currently on the media server")
            .register(registry);
        publishFailures = Counter.builder("live.publish.failures")
            .description("Publish attempts rejected by the SRS on_publish hook")
            .register(registry);
        viewerConnections = Counter.builder("live.viewer.connections")
            .description("WebRTC playback connections accepted by the SRS on_play hook")
            .register(registry);
        reconnects = Counter.builder("live.media.reconnects")
            .description("Host stream re-published after the first publish of a LIVE")
            .register(registry);
    }

    public void setActiveStreams(int count) {
        activeStreams.set(count);
    }

    public void publishFailed() {
        increment(publishFailures);
    }

    public void viewerConnected() {
        increment(viewerConnections);
    }

    public void hostReconnected() {
        increment(reconnects);
    }

    private static void increment(Counter counter) {
        if (counter != null) {
            counter.increment();
        }
    }
}
