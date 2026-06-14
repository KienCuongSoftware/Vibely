package com.vibely.backend.common;

/** Raised when S3 cleanup fails; callers should not commit DB changes. */
public class StorageDeletionException extends RuntimeException {

    public StorageDeletionException(String message) {
        super(message);
    }

    public StorageDeletionException(String message, Throwable cause) {
        super(message, cause);
    }
}
