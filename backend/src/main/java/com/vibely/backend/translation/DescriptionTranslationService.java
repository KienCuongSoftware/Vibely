package com.vibely.backend.translation;

import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DescriptionTranslationService {

    private static final Logger log = LoggerFactory.getLogger(DescriptionTranslationService.class);

    private final TranslationProperties properties;
    private final MachineTranslationClient translationClient;
    private final VideoRepository videoRepository;
    private final DescriptionTranslationRepository translationRepository;
    private final TranslationJobRepository jobRepository;
    private final TranslationCacheService cacheService;
    private final ExecutorService syncExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "translation-sync");
        t.setDaemon(true);
        return t;
    });

    public DescriptionTranslationService(
        TranslationProperties properties,
        MachineTranslationClient translationClient,
        VideoRepository videoRepository,
        DescriptionTranslationRepository translationRepository,
        TranslationJobRepository jobRepository,
        TranslationCacheService cacheService
    ) {
        this.properties = properties;
        this.translationClient = translationClient;
        this.videoRepository = videoRepository;
        this.translationRepository = translationRepository;
        this.jobRepository = jobRepository;
        this.cacheService = cacheService;
    }

    public DescriptionTranslationResponse getOrRequest(UUID publicId, String targetLangRaw) {
        try {
            return getOrRequestInternal(publicId, targetLangRaw);
        } catch (BadRequestException | NotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Translation getOrRequest failed publicId={}: {}", publicId, ex.getMessage(), ex);
            return DescriptionTranslationResponse.failed(
                truncate(ex.getMessage(), 500) != null
                    ? truncate(ex.getMessage(), 500)
                    : "Translation request failed"
            );
        }
    }

    private DescriptionTranslationResponse getOrRequestInternal(UUID publicId, String targetLangRaw) {
        if (!properties.isEnabled()) {
            return DescriptionTranslationResponse.disabled();
        }
        String targetLang = normalizeLang(targetLangRaw);
        if (!StringUtils.hasText(targetLang)) {
            throw new BadRequestException("targetLang is required");
        }

        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video not found"));

        String original = resolveCaption(video);
        if (!StringUtils.hasText(original)) {
            return DescriptionTranslationResponse.skipped(original, null, targetLang, "Empty description");
        }

        String sourceHash = sha256(original);
        String sourceLang = ensureSourceLang(video, original);

        if (sameLanguage(sourceLang, targetLang)) {
            return DescriptionTranslationResponse.skipped(
                original,
                sourceLang,
                targetLang,
                "Source and target language are the same"
            );
        }

        Optional<String> redisHit = cacheService.get(sourceHash, sourceLang, targetLang);
        if (redisHit.isPresent()) {
            return DescriptionTranslationResponse.ready(original, redisHit.get(), sourceLang, targetLang);
        }

        Optional<DescriptionTranslationEntity> pgHit =
            translationRepository.findByVideoIdAndSourceHashAndTargetLang(video.getId(), sourceHash, targetLang);
        if (pgHit.isPresent()) {
            String translated = pgHit.get().getTranslatedText();
            cacheService.put(sourceHash, sourceLang, targetLang, translated);
            return DescriptionTranslationResponse.ready(original, translated, sourceLang, targetLang);
        }

        TranslationJobEntity job = enqueueJob(video, sourceHash, sourceLang, targetLang, original);

        // Job đang chạy gần đây → không chồng sync; để worker làm.
        if (job.getJobState() == TranslationJobState.RUNNING
            && job.getClaimedAt() != null
            && job.getClaimedAt().isAfter(LocalDateTime.now().minusMinutes(2))) {
            return DescriptionTranslationResponse.pending(job.getId(), original, sourceLang, targetLang);
        }

        job.setJobState(TranslationJobState.RUNNING);
        job.setClaimedAt(LocalDateTime.now());
        job.setAttempts(job.getAttempts() + 1);
        jobRepository.save(job);

        try {
            TranslateResult result = runWithTimeout(
                () -> translationClient.translate(original, sourceLang, targetLang),
                properties.getSyncTimeoutMs()
            );
            persistSuccess(job, video, sourceHash, result);
            return DescriptionTranslationResponse.ready(
                original,
                result.translatedText(),
                result.sourceLang(),
                result.targetLang()
            );
        } catch (TimeoutException ex) {
            job.setJobState(TranslationJobState.PENDING);
            jobRepository.save(job);
            log.info("Translation sync timeout videoId={} jobId={}", video.getId(), job.getId());
            return DescriptionTranslationResponse.pending(job.getId(), original, sourceLang, targetLang);
        } catch (Exception ex) {
            try {
                markJobFailed(job, ex.getMessage());
            } catch (Exception markEx) {
                log.warn("markJobFailed failed jobId={}: {}", job.getId(), markEx.getMessage());
            }
            log.warn("Translation sync failed videoId={}: {}", video.getId(), ex.getMessage());
            if (job.getAttempts() >= properties.getMaxJobAttempts()) {
                return DescriptionTranslationResponse.failed(truncate(ex.getMessage(), 500));
            }
            return DescriptionTranslationResponse.pending(job.getId(), original, sourceLang, targetLang);
        }
    }

    public DescriptionTranslationResponse getStatus(UUID publicId, String targetLangRaw) {
        if (!properties.isEnabled()) {
            return DescriptionTranslationResponse.disabled();
        }
        String targetLang = normalizeLang(targetLangRaw);
        Video video = videoRepository.findWithAuthorByPublicId(publicId)
            .orElseThrow(() -> new NotFoundException("Video not found"));
        String original = resolveCaption(video);
        if (!StringUtils.hasText(original)) {
            return DescriptionTranslationResponse.skipped(original, null, targetLang, "Empty description");
        }
        String sourceHash = sha256(original);
        String sourceLang = video.getDescriptionLang();

        Optional<String> redisHit = cacheService.get(sourceHash, sourceLang, targetLang);
        if (redisHit.isEmpty() && sourceLang != null) {
            redisHit = cacheService.get(sourceHash, "und", targetLang);
        }
        if (redisHit.isPresent()) {
            return DescriptionTranslationResponse.ready(original, redisHit.get(), sourceLang, targetLang);
        }
        Optional<DescriptionTranslationEntity> pgHit =
            translationRepository.findByVideoIdAndSourceHashAndTargetLang(video.getId(), sourceHash, targetLang);
        if (pgHit.isPresent()) {
            String src = pgHit.get().getSourceLang() != null ? pgHit.get().getSourceLang() : sourceLang;
            cacheService.put(sourceHash, src, targetLang, pgHit.get().getTranslatedText());
            return DescriptionTranslationResponse.ready(
                original,
                pgHit.get().getTranslatedText(),
                src,
                targetLang
            );
        }
        Optional<TranslationJobEntity> job =
            jobRepository.findByVideoIdAndSourceHashAndTargetLang(video.getId(), sourceHash, targetLang);
        if (job.isPresent()) {
            TranslationJobEntity j = job.get();
            if (j.getJobState() == TranslationJobState.FAILED && j.getAttempts() >= properties.getMaxJobAttempts()) {
                return DescriptionTranslationResponse.failed(j.getLastError());
            }
            String pendingSrc = sourceLang != null ? sourceLang : j.getSourceLang();
            return DescriptionTranslationResponse.pending(j.getId(), original, pendingSrc, targetLang);
        }
        return DescriptionTranslationResponse.skipped(original, sourceLang, targetLang, "Not requested yet");
    }

    @Transactional
    public void processNextJob() {
        if (!properties.isEnabled()) {
            return;
        }
        var ids = jobRepository.findNextPendingIdForUpdate();
        if (ids.isEmpty()) {
            return;
        }
        Long jobId = ids.get(0);
        TranslationJobEntity job = jobRepository.findWithVideoById(jobId).orElse(null);
        if (job == null) {
            return;
        }
        job.setJobState(TranslationJobState.RUNNING);
        job.setClaimedAt(LocalDateTime.now());
        job.setAttempts(job.getAttempts() + 1);
        jobRepository.save(job);

        try {
            String sourceLang = job.getSourceLang();
            if (!StringUtils.hasText(sourceLang) || "und".equals(sourceLang)) {
                sourceLang = ensureSourceLang(job.getVideo(), job.getSourceText());
                job.setSourceLang(sourceLang);
            }
            TranslateResult result = translationClient.translate(
                job.getSourceText(),
                sourceLang,
                job.getTargetLang()
            );
            persistSuccess(job, job.getVideo(), job.getSourceHash(), result);
        } catch (Exception ex) {
            markJobFailed(job, ex.getMessage());
            log.warn("Translation job failed id={}: {}", job.getId(), ex.getMessage());
        }
    }

    @Transactional
    protected void persistSuccess(
        TranslationJobEntity job,
        Video video,
        String sourceHash,
        TranslateResult result
    ) {
        DescriptionTranslationEntity entity = translationRepository
            .findByVideoIdAndSourceHashAndTargetLang(video.getId(), sourceHash, result.targetLang())
            .orElseGet(DescriptionTranslationEntity::new);
        entity.setVideo(video);
        entity.setSourceHash(sourceHash);
        entity.setSourceLang(result.sourceLang());
        entity.setTargetLang(result.targetLang());
        entity.setTranslatedText(result.translatedText());
        entity.setModel(result.model());
        translationRepository.save(entity);

        if (StringUtils.hasText(result.sourceLang())
            && !result.sourceLang().equals(video.getDescriptionLang())) {
            video.setDescriptionLang(result.sourceLang());
            videoRepository.save(video);
        }

        cacheService.put(sourceHash, result.sourceLang(), result.targetLang(), result.translatedText());

        job.setJobState(TranslationJobState.DONE);
        job.setLastError(null);
        job.setSourceLang(result.sourceLang());
        jobRepository.save(job);
    }

    @Transactional
    protected void markJobFailed(TranslationJobEntity job, String error) {
        if (job.getAttempts() >= properties.getMaxJobAttempts()) {
            job.setJobState(TranslationJobState.FAILED);
        } else {
            job.setJobState(TranslationJobState.PENDING);
        }
        job.setLastError(truncate(error, 2000));
        jobRepository.save(job);
    }

    @Transactional
    protected TranslationJobEntity enqueueJob(
        Video video,
        String sourceHash,
        String sourceLang,
        String targetLang,
        String sourceText
    ) {
        return jobRepository
            .findByVideoIdAndSourceHashAndTargetLang(video.getId(), sourceHash, targetLang)
            .map(existing -> {
                if (existing.getJobState() == TranslationJobState.DONE) {
                    existing.setJobState(TranslationJobState.PENDING);
                    existing.setAttempts(0);
                    existing.setLastError(null);
                } else if (existing.getJobState() == TranslationJobState.FAILED) {
                    existing.setJobState(TranslationJobState.PENDING);
                    existing.setAttempts(0);
                    existing.setLastError(null);
                    existing.setClaimedAt(null);
                }
                existing.setSourceText(sourceText);
                existing.setSourceLang(sourceLang);
                return jobRepository.save(existing);
            })
            .orElseGet(() -> {
                TranslationJobEntity job = new TranslationJobEntity();
                job.setVideo(video);
                job.setSourceHash(sourceHash);
                job.setSourceLang(sourceLang);
                job.setTargetLang(targetLang);
                job.setSourceText(sourceText);
                job.setJobState(TranslationJobState.PENDING);
                return jobRepository.save(job);
            });
    }

    private String ensureSourceLang(Video video, String text) {
        if (StringUtils.hasText(video.getDescriptionLang())
            && !"und".equalsIgnoreCase(video.getDescriptionLang())) {
            return normalizeLang(video.getDescriptionLang());
        }
        DetectResult detected = translationClient.detect(text);
        String lang = normalizeLang(detected.language());
        if (StringUtils.hasText(lang) && !"und".equals(lang)) {
            video.setDescriptionLang(lang);
            videoRepository.save(video);
            return lang;
        }
        return "und";
    }

    private <T> T runWithTimeout(Callable<T> task, long timeoutMs) throws Exception {
        Future<T> future = syncExecutor.submit(task);
        try {
            return future.get(Math.max(500, timeoutMs), TimeUnit.MILLISECONDS);
        } catch (TimeoutException ex) {
            future.cancel(true);
            throw ex;
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause() == null ? ex : ex.getCause();
            if (cause instanceof Exception e) {
                throw e;
            }
            throw new IllegalStateException(cause);
        }
    }

    static String resolveCaption(Video video) {
        if (StringUtils.hasText(video.getDescription())) {
            return video.getDescription().trim();
        }
        if (StringUtils.hasText(video.getTitle())) {
            return video.getTitle().trim();
        }
        return "";
    }

    static String normalizeLang(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim().toLowerCase(Locale.ROOT).replace('_', '-');
        if (value.startsWith("zh-hant") || value.equals("zh-tw") || value.equals("zh-hk")) {
            return "zh-hant";
        }
        if (value.startsWith("zh")) {
            return "zh";
        }
        int dash = value.indexOf('-');
        return dash > 0 ? value.substring(0, dash) : value;
    }

    static boolean sameLanguage(String a, String b) {
        if (!StringUtils.hasText(a) || !StringUtils.hasText(b)) {
            return false;
        }
        String na = normalizeLang(a);
        String nb = normalizeLang(b);
        if (na == null || nb == null) {
            return false;
        }
        if (na.equals(nb)) {
            return true;
        }
        return na.split("-")[0].equals(nb.split("-")[0])
            && !na.startsWith("zh")
            && !nb.startsWith("zh");
    }

    static String sha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
