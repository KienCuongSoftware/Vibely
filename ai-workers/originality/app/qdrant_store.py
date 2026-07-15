from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np

LOG = logging.getLogger("originality.qdrant")

COLLECTION = os.environ.get("QDRANT_COLLECTION", "vibely_frame_embeddings")
VECTOR_SIZE_CLIP = 512  # ViT-B-32
VECTOR_SIZE_PHASH = 64


class VectorStore:
    def __init__(self) -> None:
        self.url = os.environ.get("QDRANT_URL", "http://127.0.0.1:6333")
        self.enabled = os.environ.get("QDRANT_ENABLED", "true").lower() == "true"
        self._client = None
        self._dim: int | None = None

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

    def warm(self, dim: int = VECTOR_SIZE_CLIP) -> None:
        """Connect + ensure collection at worker boot so first job does not pay cold start."""
        client = self._client_or_none()
        if client is None:
            LOG.warning("Qdrant warm skipped (disabled or unreachable url=%s)", self.url)
            return
        try:
            self.ensure_collection(dim)
            LOG.info("Qdrant warm ok url=%s collection=%s dim=%s", self.url, COLLECTION, dim)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Qdrant warm failed: %s", exc)
            self._client = None
            self.enabled = False

    def ensure_collection(self, dim: int) -> None:
        client = self._client_or_none()
        if client is None:
            return
        self._dim = dim
        names = [c.name for c in client.get_collections().collections]
        if COLLECTION in names:
            return
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=self._qm.VectorParams(size=dim, distance=self._qm.Distance.COSINE),
        )

    def upsert_video_vectors(
        self,
        video_id: int,
        public_id: str,
        vectors: np.ndarray,
        duration_seconds: float | None,
    ) -> None:
        client = self._client_or_none()
        if client is None:
            return
        dim = int(vectors.shape[1])
        self.ensure_collection(dim)
        points = []
        for i, vec in enumerate(vectors):
            points.append(
                self._qm.PointStruct(
                    id=abs(hash((video_id, i))) % (2**63 - 1),
                    vector=vec.tolist(),
                    payload={
                        "video_id": video_id,
                        "public_id": public_id,
                        "frame_index": i,
                        "duration_seconds": duration_seconds,
                    },
                )
            )
        # Also store mean-pooled video vector as frame_index=-1
        mean = vectors.mean(axis=0)
        mean = mean / (np.linalg.norm(mean) + 1e-8)
        points.append(
            self._qm.PointStruct(
                id=abs(hash((video_id, -1))) % (2**63 - 1),
                vector=mean.astype(np.float32).tolist(),
                payload={
                    "video_id": video_id,
                    "public_id": public_id,
                    "frame_index": -1,
                    "duration_seconds": duration_seconds,
                },
            )
        )
        client.upsert(collection_name=COLLECTION, points=points)

    def search_similar(
        self,
        query_vectors: np.ndarray,
        exclude_video_id: int,
        top_k: int = 20,
    ) -> list[dict[str, Any]]:
        client = self._client_or_none()
        if client is None:
            return []
        dim = int(query_vectors.shape[1])
        self.ensure_collection(dim)
        mean = query_vectors.mean(axis=0)
        mean = mean / (np.linalg.norm(mean) + 1e-8)
        hits = client.search(
            collection_name=COLLECTION,
            query_vector=mean.astype(np.float32).tolist(),
            limit=top_k,
            query_filter=self._qm.Filter(
                must_not=[
                    self._qm.FieldCondition(
                        key="video_id",
                        match=self._qm.MatchValue(value=exclude_video_id),
                    )
                ]
            ),
        )
        out = []
        for hit in hits:
            payload = hit.payload or {}
            out.append(
                {
                    "video_id": payload.get("video_id"),
                    "public_id": payload.get("public_id"),
                    "frame_index": payload.get("frame_index"),
                    "score": float(hit.score),
                }
            )
        return out
