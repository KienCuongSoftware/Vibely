package com.vibely.backend.common;

import com.github.f4b6a3.uuid.UuidCreator;
import java.util.UUID;

/** Time-ordered UUIDv7 for public ids and append-heavy tables (index locality, monotonic inserts). */
public final class UuidV7 {

    private UuidV7() {}

    public static UUID generate() {
        return UuidCreator.getTimeOrderedEpoch();
    }
}
