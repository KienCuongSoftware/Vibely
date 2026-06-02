package com.vibely.backend.share;

import com.vibely.backend.share.redis.RedisShareCounterCache;
import com.vibely.backend.video.VideoRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShareAsyncRecorder {

    private static final Logger log = LoggerFactory.getLogger(ShareAsyncRecorder.class);

    private final RedirectLogRepository redirectLogRepository;
    private final ShareAnalyticsRepository shareAnalyticsRepository;
    private final ShortLinkRepository shortLinkRepository;
    private final VideoRepository videoRepository;
    private final ObjectProvider<RedisShareCounterCache> shareCounterCache;

    public ShareAsyncRecorder(
        RedirectLogRepository redirectLogRepository,
        ShareAnalyticsRepository shareAnalyticsRepository,
        ShortLinkRepository shortLinkRepository,
        VideoRepository videoRepository,
        ObjectProvider<RedisShareCounterCache> shareCounterCache
    ) {
        this.redirectLogRepository = redirectLogRepository;
        this.shareAnalyticsRepository = shareAnalyticsRepository;
        this.shortLinkRepository = shortLinkRepository;
        this.videoRepository = videoRepository;
        this.shareCounterCache = shareCounterCache;
    }

    @Async("shareTaskExecutor")
    @Transactional
    public void recordShareCreated(VideoShare share) {
        try {
            ShareAnalyticsEvent event = new ShareAnalyticsEvent();
            event.setVideo(share.getVideo());
            event.setShortLink(share.getShortLink());
            event.setVideoShareId(share.getId());
            event.setEventType(ShareEventType.SHARE_CREATED);
            event.setChannel(share.getChannel());
            event.setShareSource(share.getChannel());
            event.setDeviceClass(share.getDeviceClass());
            event.setBrowserFamily(share.getBrowserFamily());
            event.setOsFamily(share.getOsFamily());
            event.setCountryCode(share.getCountryCode());
            event.setReferrer(share.getReferrer());
            event.setIpHash(share.getIpHash());
            shareAnalyticsRepository.save(event);
        } catch (Exception ex) {
            log.warn("Failed to persist SHARE_CREATED analytics shareId={}", share.getId(), ex);
        }
    }

    @Async("shareTaskExecutor")
    @Transactional
    public void recordLinkClicked(
        ShortLink link,
        HttpServletRequest request,
        short responseStatus
    ) {
        try {
            String ip = ShareClientHints.clientIp(request);
            String ipHash = ShareHashing.sha256Hex(ip);
            String ua = request.getHeader("User-Agent");
            String uaHash = ShareHashing.sha256Hex(ua);
            ClientDeviceHints hints = ShareClientHints.fromUserAgent(ua);
            String visitorKey = ShareHashing.visitorKey(ipHash, uaHash, LocalDate.now().toString());

            RedirectLog row = new RedirectLog();
            row.setShortLink(link);
            row.setVideo(link.getVideo());
            row.setShortCode(link.getShortCode());
            row.setVisitorKey(visitorKey);
            row.setIpHash(ipHash);
            row.setUserAgent(truncate(ua, 512));
            row.setReferer(truncate(request.getHeader("Referer"), 2048));
            row.setDeviceClass(hints.deviceClass());
            row.setBrowserFamily(hints.browserFamily());
            row.setOsFamily(hints.osFamily());
            row.setCountryCode(ShareClientHints.countryCode(request));
            row.setAcceptLanguage(truncate(request.getHeader("Accept-Language"), 128));
            row.setBot(hints.bot());
            row.setResponseStatus(responseStatus);
            redirectLogRepository.save(row);

            shortLinkRepository.incrementClickCount(link.getId());

            ShareAnalyticsEvent event = new ShareAnalyticsEvent();
            event.setVideo(link.getVideo());
            event.setShortLink(link);
            event.setRedirectLogId(row.getId());
            event.setEventType(ShareEventType.LINK_CLICKED);
            event.setChannel(link.getChannel());
            event.setShareSource("redirect");
            event.setDeviceClass(hints.deviceClass());
            event.setBrowserFamily(hints.browserFamily());
            event.setOsFamily(hints.osFamily());
            event.setCountryCode(row.getCountryCode());
            event.setReferrer(row.getReferer());
            event.setVisitorKey(visitorKey);
            event.setIpHash(ipHash);
            shareAnalyticsRepository.save(event);
        } catch (Exception ex) {
            log.warn("Failed to persist LINK_CLICKED analytics code={}", link.getShortCode(), ex);
        }
    }

    @Async("shareTaskExecutor")
    @Transactional
    public void bumpVideoShareCount(long videoId, UUID videoPublicId) {
        try {
            videoRepository.incrementShareCount(videoId, com.vibely.backend.video.VideoStatus.READY);
            shareCounterCache.ifAvailable(cache -> cache.increment(videoPublicId));
        } catch (Exception ex) {
            log.warn("Failed to increment share_count videoPublicId={}", videoPublicId, ex);
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
