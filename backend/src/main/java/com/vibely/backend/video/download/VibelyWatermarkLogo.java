package com.vibely.backend.video.download;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

/** Materializes the Vibely brand mark as PNG for FFmpeg overlay. */
final class VibelyWatermarkLogo {

    private static final String RESOURCE = "/brand/vibely-logo.ico";

    private VibelyWatermarkLogo() {}

    static Path materializePng(Path workDir) throws IOException {
        try (InputStream in = VibelyWatermarkLogo.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IOException("Missing classpath resource " + RESOURCE);
            }
            BufferedImage source = ImageIO.read(in);
            if (source == null) {
                throw new IOException("Could not decode " + RESOURCE);
            }
            int targetH = 44;
            int targetW = Math.max(1, (int) Math.round(source.getWidth() * (targetH / (double) source.getHeight())));
            BufferedImage scaled = new BufferedImage(targetW, targetH, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = scaled.createGraphics();
            g.drawImage(source.getScaledInstance(targetW, targetH, Image.SCALE_SMOOTH), 0, 0, null);
            g.dispose();
            Path out = workDir.resolve("vibely-watermark-logo.png");
            ImageIO.write(scaled, "png", out.toFile());
            return out;
        }
    }
}
