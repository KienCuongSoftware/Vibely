package com.vibely.backend.share;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.config.AppUrlProperties;
import com.vibely.backend.share.dto.ShareAnalyticsBucketResponse;
import com.vibely.backend.share.dto.ShareAnalyticsResponse;
import com.vibely.backend.share.dto.ShareVideoRequest;
import com.vibely.backend.share.dto.ShareVideoResponse;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vibely.backend.share.redis.RedisShareCounterCache;

@Service
public class ShareService {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final ShortLinkRepository shortLinkRepository;
    private final VideoShareRepository videoShareRepository;
    private final ShareAnalyticsRepository shareAnalyticsRepository;
    private final ShortCodeGenerator shortCodeGenerator;
    private final ShortLinkCache shortLinkCache;
    private final AppUrlProperties appUrlProperties;
    private final ShareAsyncRecorder shareAsyncRecorder;
    private final ObjectProvider<RedisShareCounterCache> shareCounterCache;

    public ShareService(
        VideoRepository videoRepository,
        UserRepository userRepository,
        ShortLinkRepository shortLinkRepository,
        VideoShareRepository videoShareRepository,
        ShareAnalyticsRepository shareAnalyticsRepository,
        ShortCodeGenerator shortCodeGenerator,
        ShortLinkCache shortLinkCache,
        AppUrlProperties appUrlProperties,
        ShareAsyncRecorder shareAsyncRecorder,
        ObjectProvider<RedisShareCounterCache> shareCounterCache
    ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.shortLinkRepository = shortLinkRepository;
        this.videoShareRepository = videoShareRepository;
        this.shareAnalyticsRepository = shareAnalyticsRepository;
        this.shortCodeGenerator = shortCodeGenerator;
        this.shortLinkCache = shortLinkCache;
        this.appUrlProperties = appUrlProperties;
        this.shareAsyncRecorder = shareAsyncRecorder;
        this.shareCounterCache = shareCounterCache;
    }

    @Transactional
    public ShareVideoResponse createShare(
        UUID videoPublicId,
        String userEmail,
        ShareVideoRequest request,
        HttpServletRequest httpRequest
    ) {
        Video video = videoRepository.findByPublicId(videoPublicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (video.getStatus() != VideoStatus.READY) {
            throw new BadRequestException("Video chưa sẵn sàng để chia sẻ");
        }

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        ShareChannel channel = ShareChannel.from(request == null ? null : request.channel());
        String idempotencyKey = request == null ? null : normalizeBlank(request.idempotencyKey());

        if (idempotencyKey != null) {
            Optional<VideoShare> existing = videoShareRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return toResponse(video, existing.get().getShortLink());
            }
        }

        ShortLink link = getOrCreatePrimaryShortLink(video, user, channel);
        warmCache(link);

        String ip = ShareClientHints.clientIp(httpRequest);
        String ipHash = ShareHashing.sha256Hex(ip);
        String ua = httpRequest.getHeader("User-Agent");
        String uaHash = ShareHashing.sha256Hex(ua);
        ClientDeviceHints hints = ShareClientHints.fromUserAgent(ua);

        VideoShare share = new VideoShare();
        share.setVideo(video);
        share.setUser(user);
        share.setShortLink(link);
        share.setChannel(channel.wireValue());
        share.setIdempotencyKey(idempotencyKey);
        share.setReferrer(request == null ? null : normalizeBlank(request.referrer()));
        share.setIpHash(ipHash);
        share.setUserAgentHash(uaHash);
        share.setDeviceClass(hints.deviceClass());
        share.setBrowserFamily(hints.browserFamily());
        share.setOsFamily(hints.osFamily());
        share.setCountryCode(ShareClientHints.countryCode(httpRequest));
        videoShareRepository.save(share);

        shareAsyncRecorder.recordShareCreated(share);
        videoRepository.incrementShareCount(video.getId(), VideoStatus.READY);
        Video refreshed = videoRepository.findByPublicId(videoPublicId).orElse(video);
        shareCounterCache.ifAvailable(cache -> cache.increment(refreshed.getPublicId()));

        return toResponse(refreshed, link);
    }

    @Transactional(readOnly = true)
    public ShareAnalyticsResponse getAnalytics(UUID videoPublicId, String requesterEmail, int days) {
        Video video = videoRepository.findByPublicId(videoPublicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        User requester = userRepository.findByEmail(requesterEmail)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
        Long authorId = videoRepository.findAuthorIdByPublicId(videoPublicId)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy video"));
        if (!authorId.equals(requester.getId())) {
            throw new BadRequestException("Bạn không có quyền xem analytics video này");
        }

        int windowDays = Math.max(1, Math.min(days, 90));
        OffsetDateTime since = OffsetDateTime.now().minusDays(windowDays);
        long internalVideoId = video.getId();

        List<ShareAnalyticsBucketResponse> buckets = new ArrayList<>();
        for (Object[] row : shareAnalyticsRepository.aggregateSinceRaw(internalVideoId, since)) {
            buckets.add(new ShareAnalyticsBucketResponse(
                stringAt(row, 0),
                stringAt(row, 1),
                stringAt(row, 2),
                stringAt(row, 3),
                longAt(row, 4)
            ));
        }

        return new ShareAnalyticsResponse(
            video.getPublicId(),
            shareAnalyticsRepository.countShareEventsSince(internalVideoId, since),
            shareAnalyticsRepository.countLinkClicksSince(internalVideoId, since),
            shareAnalyticsRepository.countUniqueVisitorsSince(internalVideoId, since),
            video.getShareCount(),
            buckets
        );
    }

    private ShortLink getOrCreatePrimaryShortLink(Video video, User user, ShareChannel channel) {
        Optional<ShortLink> existing = shortLinkRepository.findByVideoIdAndPrimaryLinkTrueAndStatus(
            video.getId(),
            ShortLinkStatus.ACTIVE
        );
        if (existing.isPresent()) {
            return existing.get();
        }
        ShortLink link = new ShortLink();
        link.setVideo(video);
        link.setCreatedBy(user);
        link.setChannel(channel.wireValue());
        link.setPrimaryLink(true);
        link.setStatus(ShortLinkStatus.ACTIVE);
        link.setShortCode(shortCodeGenerator.generateUnique());
        return shortLinkRepository.save(link);
    }

    private void warmCache(ShortLink link) {
        shortLinkCache.put(new ShortLinkCacheEntry(
            link.getVideo().getPublicId(),
            link.getShortCode(),
            link.getStatus()
        ));
    }

    private ShareVideoResponse toResponse(Video video, ShortLink link) {
        return new ShareVideoResponse(
            video.getPublicId(),
            link.getShortCode(),
            appUrlProperties.shortUrl(link.getShortCode()),
            appUrlProperties.watchUrl(video.getPublicId()),
            appUrlProperties.embedUrl(video.getPublicId()),
            appUrlProperties.deepLink(video.getPublicId()),
            video.getShareCount()
        );
    }

    private static String normalizeBlank(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String stringAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return null;
        }
        return String.valueOf(row[index]);
    }

    private static long longAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return 0L;
        }
        if (row[index] instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(row[index]));
    }
}
