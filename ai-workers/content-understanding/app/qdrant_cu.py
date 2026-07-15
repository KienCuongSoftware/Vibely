"""Qdrant collections for Content Understanding (separate from originality)."""

from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np

LOG = logging.getLogger("content_understanding.qdrant")

COLLECTION_FRAME = os.environ.get("CU_QDRANT_COLLECTION_FRAME", "vibely_cu_frame")
COLLECTION_VIDEO = os.environ.get("CU_QDRANT_COLLECTION_VIDEO", "vibely_cu_video")


class CuVectorStore:
    def __init__(self) -> None:
        self.url = os.environ.get("QDRANT_URL", "http://127.0.0.1:6333")
        self.enabled = os.environ.get("CU_QDRANT_ENABLED", "true").lower() in {"1", "true", "yes"}
        self._client = None
        self._qm = None

    def _client_or_none(self):
        if not self.enabled:
            return None
        if self._client is not None:
            return self._client
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http import models as qm

            timeout = float(os.environ.get("QDRANT_TIMEOUT_SECONDS", "5"))
            self._client = QdrantClient(url=self.url, timeout=timeout)
            self._qm = qm
            return self._client
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Qdrant unavailable: %s", exc)
            self.enabled = False
            return None

    def warm(self, dim: int = 512) -> None:
        client = self._client_or_none()
        if client is None:
            LOG.warning("CU Qdrant warm skipped (disabled or unreachable url=%s)", self.url)
            return
        try:
            self._ensure(COLLECTION_FRAME, dim)
            self._ensure(COLLECTION_VIDEO, dim)
            LOG.info(
                "CU Qdrant warm ok url=%s frames=%s video=%s",
                self.url,
                COLLECTION_FRAME,
                COLLECTION_VIDEO,
            )
        except Exception as exc:  # noqa: BLE001
            LOG.warning("CU Qdrant warm failed: %s", exc)
            self._client = None
            self.enabled = False

    def _ensure(self, name: str, dim: int) -> None:
        client = self._client_or_none()
        if client is None:
            return
        names = {c.name for c in client.get_collections().collections}
        if name in names:
            return
        client.create_collection(
            collection_name=name,
            vectors_config=self._qm.VectorParams(size=dim, distance=self._qm.Distance.COSINE),
        )
        LOG.info("Created Qdrant collection %s dim=%s", name, dim)

    def upsert_video(
        self,
        *,
        video_id: int,
        public_id: str | None,
        frame_vectors: np.ndarray,
        video_mean: np.ndarray,
        model_id: str,
        top_tag_slugs: list[str],
        frame_meta: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Never raise — Qdrant outages must not fail CU jobs."""
        try:
            client = self._client_or_none()
            if client is None or frame_vectors.size == 0:
                return {"note": "qdrant disabled or no vectors", "framePoints": 0}

            dim = int(frame_vectors.shape[1])
            self._ensure(COLLECTION_FRAME, dim)
            self._ensure(COLLECTION_VIDEO, dim)

            frame_meta = frame_meta or []
            frame_points = []
            for i, vec in enumerate(frame_vectors):
                meta = frame_meta[i] if i < len(frame_meta) else {}
                frame_points.append(
                    self._qm.PointStruct(
                        id=abs(hash(("cu_frame", video_id, i))) % (2**63 - 1),
                        vector=vec.astype(np.float32).tolist(),
                        payload={
                            "video_id": video_id,
                            "public_id": public_id,
                            "frame_index": meta.get("frameIndex", i),
                            "t_ms": meta.get("tMs"),
                            "model_version": model_id,
                            "kind": "frame",
                        },
                    )
                )
            if frame_points:
                client.upsert(collection_name=COLLECTION_FRAME, points=frame_points)

            video_point = self._qm.PointStruct(
                # Stable point id = video_id so Spring Related can recommend by id.
                id=int(video_id),
                vector=video_mean.astype(np.float32).tolist(),
                payload={
                    "video_id": video_id,
                    "public_id": public_id,
                    "model_version": model_id,
                    "top_tags": top_tag_slugs[:12],
                    "frame_count": int(frame_vectors.shape[0]),
                    "kind": "video_mean",
                },
            )
            client.upsert(collection_name=COLLECTION_VIDEO, points=[video_point])

            return {
                "frameCollection": COLLECTION_FRAME,
                "videoCollection": COLLECTION_VIDEO,
                "framePoints": len(frame_points),
                "vectorDim": dim,
            }
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Qdrant upsert soft-failed: %s", exc)
            return {"note": f"qdrant error: {exc}"[:300], "framePoints": 0}
