package com.vibely.backend.antibot.captcha;

import java.awt.AlphaComposite;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.geom.CubicCurve2D;
import java.awt.geom.GeneralPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Random;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;

@Component
public class SliderCaptchaImageGenerator {

    public static final int WIDTH = 320;
    public static final int HEIGHT = 180;
    public static final int PIECE_SIZE = 52;

    public SliderPuzzle generate(long seed) {
        BufferedImage background = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = background.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        Random rng = new Random(seed);

        paintBackground(g, rng);
        applyNoise(g, rng);
        applyWarp(background, rng);

        int targetX = 60 + rng.nextInt(WIDTH - PIECE_SIZE - 80);
        int targetY = 30 + rng.nextInt(HEIGHT - PIECE_SIZE - 20);
        int piecePad = 6;
        int tabDir = rng.nextBoolean() ? 1 : -1;
        GeneralPath pieceMask = bezierPuzzlePath(piecePad, piecePad, PIECE_SIZE, tabDir);
        GeneralPath holeMask = (GeneralPath) pieceMask.clone();
        holeMask.transform(AffineTransform.getTranslateInstance(targetX - piecePad, targetY - piecePad));

        BufferedImage piece = new BufferedImage(PIECE_SIZE + piecePad * 2, PIECE_SIZE + piecePad * 2, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pieceG = piece.createGraphics();
        pieceG.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        pieceG.setClip(pieceMask);
        pieceG.drawImage(background, -targetX + piecePad, -targetY + piecePad, null);
        pieceG.dispose();

        Graphics2D overlay = background.createGraphics();
        overlay.setComposite(AlphaComposite.SrcOver.derive(0.55f));
        overlay.setColor(new Color(0, 0, 0, 120));
        overlay.fill(holeMask);
        overlay.setStroke(new BasicStroke(2f));
        overlay.setColor(new Color(255, 255, 255, 90));
        overlay.draw(holeMask);
        overlay.dispose();

        return new SliderPuzzle(
            toJpegDataUrl(background),
            toPngDataUrl(piece),
            targetX,
            targetY
        );
    }

    private void paintBackground(Graphics2D g, Random rng) {
        g.setColor(new Color(30 + rng.nextInt(120), 30 + rng.nextInt(120), 30 + rng.nextInt(120)));
        g.fillRect(0, 0, WIDTH, HEIGHT);
        for (int i = 0; i < 10; i++) {
            g.setColor(new Color(rng.nextInt(256), rng.nextInt(256), rng.nextInt(256), 90 + rng.nextInt(100)));
            g.fillOval(rng.nextInt(WIDTH), rng.nextInt(HEIGHT), 40 + rng.nextInt(120), 40 + rng.nextInt(120));
        }
    }

    private void applyNoise(Graphics2D g, Random rng) {
        for (int i = 0; i < 900; i++) {
            g.setColor(new Color(rng.nextInt(256), rng.nextInt(256), rng.nextInt(256), 40 + rng.nextInt(80)));
            g.fillRect(rng.nextInt(WIDTH), rng.nextInt(HEIGHT), 2, 2);
        }
    }

    private void applyWarp(BufferedImage image, Random rng) {
        int amp = 2 + rng.nextInt(3);
        BufferedImage copy = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < HEIGHT; y++) {
            int shift = (int) (Math.sin(y / 14.0) * amp);
            for (int x = 0; x < WIDTH; x++) {
                int srcX = Math.min(WIDTH - 1, Math.max(0, x + shift));
                copy.setRGB(x, y, image.getRGB(srcX, y));
            }
        }
        Graphics2D g = image.createGraphics();
        g.drawImage(copy, 0, 0, null);
        g.dispose();
    }

    private GeneralPath bezierPuzzlePath(int x, int y, int size, int tabDir) {
        GeneralPath path = new GeneralPath();
        int tab = size / 4;
        int dir = tabDir;
        path.moveTo(x, y);
        path.lineTo(x + size / 2 - tab, y);
        CubicCurve2D topTab = new CubicCurve2D.Float(
            x + size / 2 - tab, y,
            x + size / 2 - tab, y - tab * dir,
            x + size / 2 + tab, y - tab * dir,
            x + size / 2 + tab, y
        );
        path.append(topTab, true);
        path.lineTo(x + size, y);
        path.lineTo(x + size, y + size);
        path.lineTo(x, y + size);
        path.closePath();
        return path;
    }

    private String toJpegDataUrl(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "jpg", out);
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to encode slider background", ex);
        }
    }

    private String toPngDataUrl(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to encode slider piece", ex);
        }
    }

    public record SliderPuzzle(String backgroundBase64, String puzzleBase64, int targetX, int targetY) {
    }
}
