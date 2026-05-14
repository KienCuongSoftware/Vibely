package com.vibely.backend.processing;

import com.vibely.backend.storage.S3Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * One-shot log at startup so local/dev misconfiguration (worker on without S3 pipeline beans) is obvious in the console.
 */
@Component
public class ProcessingPipelineDiagnostics {

    /** Short name so narrow terminals do not splice thread/logger columns with adjacent lines. */
    private static final Logger log = LoggerFactory.getLogger("vibely.diag");

    @EventListener(ApplicationReadyEvent.class)
    public void onReady(ApplicationReadyEvent event) {
        ApplicationContext ctx = event.getApplicationContext();
        Environment env = ctx.getEnvironment();
        String appS3Env = env.getProperty("APP_S3_ENABLED");
        String resolvedEnabled = env.getProperty("app.s3.enabled");
        if (!ctx.getBeansOfType(S3Properties.class).isEmpty()) {
            S3Properties s3 = ctx.getBean(S3Properties.class);
            // Avoid dotted property text + "=" in one token (some consoles mangle adjacent "Started …" lines).
            log.info(
                "S3 diagnostics: boundEnabled={}, bucketNonBlank={}, envAppS3Flag={}",
                s3.isEnabled(),
                s3.getBucket() != null && !s3.getBucket().isBlank(),
                appS3Env
            );
            log.info("S3 diagnostics: yamlBindingS3On={}", resolvedEnabled);
        }
        if (!ctx.getBeansOfType(ProcessingProperties.class).isEmpty()) {
            ProcessingProperties p = ctx.getBean(ProcessingProperties.class);
            WindowsFfmpegPathResolver.applyIfNeeded(p);
            boolean workerProp = p.getWorker().isEnabled();
            boolean dryRun = p.isDryRunPromoteWhenWorkerDisabled();
            boolean pipeline = ctx.getBeansOfType(FfmpegHlsPipelineRunner.class).size() > 0;
            boolean jobWorker = ctx.getBeansOfType(VideoProcessingJobWorker.class).size() > 0;
            log.info(
                "Processing diagnostics: workerOn={} dryRunWhenWorkerOff={} ffmpegPipelineBean={} jobWorkerBean={}",
                workerProp,
                dryRun,
                pipeline,
                jobWorker
            );
            log.info(
                "FFmpeg tools: ffmpegPath={} ffprobePath={} osName={}",
                p.getFfmpegPath(),
                p.getFfprobePath(),
                System.getProperty("os.name", "")
            );
            boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
            if (pipeline && windows) {
                String fp = p.getFfprobePath();
                String ff = p.getFfmpegPath();
                boolean shortProbe = fp != null && !fp.contains("\\") && !fp.contains("/");
                boolean shortFfmpeg = ff != null && !ff.contains("\\") && !ff.contains("/");
                if (shortProbe || shortFfmpeg) {
                    log.warn(
                        "Windows + duong ffmpeg/ffprobe ngan (ten lenh): neu pipeline bao CreateProcess error=2, "
                            + "dat FFPROBE_PATH / FFMPEG_PATH toi file .exe day du hoac them FFmpeg vao PATH cua JVM."
                    );
                }
            }
            if (workerProp && !jobWorker) {
                log.warn(
                    "Worker bat nhung khong co VideoProcessingJobWorker / FfmpegHlsPipelineRunner. "
                        + "Can app.s3.enabled=true va S3Client (xem dong S3 phia tren). "
                        + "Neu bound enabled=true ma van thieu bean: kiem tra loi khoi tao S3Client hoac @Scheduled."
                );
            }
            if (!workerProp && !dryRun) {
                log.warn(
                    "Worker tắt và dry-run-promote-when-worker-disabled=false: video mới ở trạng thái RAW có thể không lên feed cho đến khi bật worker hoặc bật lại dry-run."
                );
            }
        }
    }
}
