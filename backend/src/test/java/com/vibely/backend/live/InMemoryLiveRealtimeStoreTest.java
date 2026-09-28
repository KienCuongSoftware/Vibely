package com.vibely.backend.live;

import com.vibely.backend.live.realtime.InMemoryLiveRealtimeStore;
import com.vibely.backend.live.realtime.LiveRealtimeStore.ViewerChange;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryLiveRealtimeStoreTest {

    private static final long LIVE_ID = 42L;

    private InMemoryLiveRealtimeStore store;

    @BeforeEach
    void setUp() {
        store = new InMemoryLiveRealtimeStore();
        store.activate(LIVE_ID);
    }

    @Test
    void joinIncrementsUniqueViewersAndTracksPeak() {
        ViewerChange first = store.join(LIVE_ID, 1L);
        ViewerChange secondTab = store.join(LIVE_ID, 1L);
        ViewerChange other = store.join(LIVE_ID, 2L);

        assertThat(first.accepted()).isTrue();
        assertThat(first.countChanged()).isTrue();
        assertThat(secondTab.countChanged()).isFalse();
        assertThat(other.viewerCount()).isEqualTo(2);
        assertThat(store.viewerCount(LIVE_ID)).isEqualTo(2);
        assertThat(store.peakViewerCount(LIVE_ID)).isEqualTo(2);
    }

    @Test
    void leaveDecrementsOnlyWhenLastConnectionCloses() {
        store.join(LIVE_ID, 1L);
        store.join(LIVE_ID, 1L);

        assertThat(store.leave(LIVE_ID, 1L).countChanged()).isFalse();
        assertThat(store.viewerCount(LIVE_ID)).isEqualTo(1);
        assertThat(store.leave(LIVE_ID, 1L).countChanged()).isTrue();
        assertThat(store.viewerCount(LIVE_ID)).isZero();
        assertThat(store.peakViewerCount(LIVE_ID)).isEqualTo(1);
    }

    @Test
    void viewerCountNeverGoesNegative() {
        ViewerChange stray = store.leave(LIVE_ID, 99L);
        store.join(LIVE_ID, 1L);
        store.leave(LIVE_ID, 1L);
        store.leave(LIVE_ID, 1L);

        assertThat(stray.accepted()).isFalse();
        assertThat(store.viewerCount(LIVE_ID)).isZero();
        assertThat(store.leave(7L, 1L).viewerCount()).isZero();
    }

    @Test
    void rejectsJoinsOnceDeactivated() {
        store.join(LIVE_ID, 1L);
        store.deactivate(LIVE_ID);

        assertThat(store.join(LIVE_ID, 2L).accepted()).isFalse();
        assertThat(store.viewerCount(LIVE_ID)).isEqualTo(1);

        store.clear(LIVE_ID);
        assertThat(store.viewerCount(LIVE_ID)).isZero();
        assertThat(store.join(LIVE_ID, 3L).accepted()).isFalse();
    }

    @Test
    void concurrentJoinsAndLeavesStayConsistent() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> tasks = new ArrayList<>();
        for (long user = 1; user <= 200; user++) {
            long viewer = user;
            tasks.add(pool.submit(() -> {
                go.await();
                store.join(LIVE_ID, viewer);
                store.join(LIVE_ID, viewer);
                store.leave(LIVE_ID, viewer);
                store.leave(LIVE_ID, viewer);
                store.leave(LIVE_ID, viewer);
                return null;
            }));
        }
        go.countDown();
        for (Future<?> task : tasks) {
            task.get(10, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(store.viewerCount(LIVE_ID)).isZero();
        assertThat(store.peakViewerCount(LIVE_ID)).isBetween(1L, 200L);
    }

    @Test
    void likesSeedFromPersistedValueAndDrainOnce() {
        assertThat(store.addLikes(LIVE_ID, 1L, 5, 100)).isEqualTo(105);
        assertThat(store.addLikes(LIVE_ID, 2L, 3, 100)).isEqualTo(108);
        assertThat(store.addLikes(LIVE_ID, 1L, 2, 100)).isEqualTo(110);

        assertThat(store.drainPendingLikes(LIVE_ID)).containsEntry(1L, 7L).containsEntry(2L, 3L);
        assertThat(store.drainPendingLikes(LIVE_ID)).isEmpty();
        assertThat(store.likeCount(LIVE_ID, 0)).isEqualTo(110);
    }

    @Test
    void acquireGrantsUpToLimitPerWindow() {
        Duration window = Duration.ofMinutes(1);
        assertThat(store.acquire("chat:1:1", 1, 5, window)).isEqualTo(1);
        for (int index = 0; index < 4; index++) {
            store.acquire("chat:1:1", 1, 5, window);
        }
        assertThat(store.acquire("chat:1:1", 1, 5, window)).isZero();
        assertThat(store.acquire("chat:1:2", 1, 5, window)).isEqualTo(1);

        assertThat(store.acquire("like:1:1", 250, 300, window)).isEqualTo(250);
        assertThat(store.acquire("like:1:1", 100, 300, window)).isEqualTo(50);
        assertThat(store.acquire("like:1:1", 100, 300, window)).isZero();
    }
}
