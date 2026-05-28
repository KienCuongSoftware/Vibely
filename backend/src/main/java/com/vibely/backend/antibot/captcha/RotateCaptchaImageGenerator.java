package com.vibely.backend.antibot.captcha;

import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Area;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Random;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;

@Component
public class RotateCaptchaImageGenerator {

    public static final int SIZE = 280;
    public static final int INNER_RADIUS = 98;
    private static final int OUTER_RADIUS = SIZE / 2 - 6;
    private final Random random = new Random();

    public String generateBase64(long seed) {
        return toJpegDataUrl(renderBaseImage(seed));
    }

    private String toJpegDataUrl(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "jpg", out);
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to encode captcha image", ex);
        }
    }

    public int randomCorrectAngle() {
        return random.nextInt(360);
    }

    public int randomDisplayRotation(int correctAngle) {
        int offset = 60 + random.nextInt(241);
        return (correctAngle + offset) % 360;
    }

    public RotateLayers generateRotateLayers(long seed, int correctAngle, int displayRotation) {
        BufferedImage base = renderBaseImage(seed);
        String outerRingBase64 = toPngDataUrl(renderRingLayer(base, correctAngle, true));
        String innerDiscBase64 = toPngDataUrl(renderRingLayer(base, displayRotation, false));
        return new RotateLayers(outerRingBase64, innerDiscBase64);
    }

    private BufferedImage renderBaseImage(long seed) {
        BufferedImage image = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        Random rng = new Random(seed);

        int c1 = 40 + rng.nextInt(160);
        int c2 = 40 + rng.nextInt(160);
        int c3 = 40 + rng.nextInt(160);
        g.setColor(new Color(c1, c2, c3));
        g.fillRect(0, 0, SIZE, SIZE);

        for (int i = 0; i < 14; i++) {
            g.setColor(new Color(
                rng.nextInt(256),
                rng.nextInt(256),
                rng.nextInt(256),
                80 + rng.nextInt(120)
            ));
            int w = 40 + rng.nextInt(140);
            int h = 40 + rng.nextInt(140);
            g.fillOval(rng.nextInt(SIZE - w), rng.nextInt(SIZE - h), w, h);
        }

        g.setComposite(AlphaComposite.SrcOver.derive(0.35f));
        for (int i = 0; i < 600; i++) {
            g.setColor(new Color(rng.nextInt(256), rng.nextInt(256), rng.nextInt(256)));
            g.fillRect(rng.nextInt(SIZE), rng.nextInt(SIZE), 2, 2);
        }

        g.dispose();
        return image;
    }

    private BufferedImage renderRingLayer(BufferedImage base, int rotationDegrees, boolean outerRing) {
        BufferedImage layer = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = layer.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        double cx = SIZE / 2.0;
        double cy = SIZE / 2.0;
        Area clip = new Area(new Ellipse2D.Double(cx - OUTER_RADIUS, cy - OUTER_RADIUS, OUTER_RADIUS * 2, OUTER_RADIUS * 2));
        if (outerRing) {
            Area innerHole = new Area(new Ellipse2D.Double(
                cx - INNER_RADIUS,
                cy - INNER_RADIUS,
                INNER_RADIUS * 2.0,
                INNER_RADIUS * 2.0
            ));
            clip.subtract(innerHole);
        } else {
            clip = new Area(new Ellipse2D.Double(
                cx - INNER_RADIUS,
                cy - INNER_RADIUS,
                INNER_RADIUS * 2.0,
                INNER_RADIUS * 2.0
            ));
        }
        g.setClip(clip);

        g.translate(cx, cy);
        g.rotate(Math.toRadians(rotationDegrees));
        g.drawImage(base, -SIZE / 2, -SIZE / 2, SIZE, SIZE, null);
        g.dispose();

        if (outerRing) {
            Graphics2D border = layer.createGraphics();
            border.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            border.setColor(new Color(255, 255, 255, 70));
            border.setStroke(new java.awt.BasicStroke(2f));
            border.draw(new Ellipse2D.Double(cx - INNER_RADIUS, cy - INNER_RADIUS, INNER_RADIUS * 2.0, INNER_RADIUS * 2.0));
            border.dispose();
        }

        return layer;
    }

    private String toPngDataUrl(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to encode captcha layer", ex);
        }
    }

    public record RotateLayers(String outerRingBase64, String innerDiscBase64) {
    }
}
