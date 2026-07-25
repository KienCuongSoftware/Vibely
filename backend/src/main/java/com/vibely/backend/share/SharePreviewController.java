package com.vibely.backend.share;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class SharePreviewController {

    private final SharePreviewService sharePreviewService;

    public SharePreviewController(SharePreviewService sharePreviewService) {
        this.sharePreviewService = sharePreviewService;
    }

    @GetMapping(value = "/share/video/{publicId}", produces = MediaType.TEXT_HTML_VALUE)
    public void shareVideoPreview(
        @PathVariable String publicId,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        UUID videoPublicId = SharePreviewService.parsePublicId(publicId);
        SharePreviewModel model = sharePreviewService.buildModel(videoPublicId, request);
        writeSharePreview(request, response, model, false);
    }

    @GetMapping(value = "/share/profile/{username}", produces = MediaType.TEXT_HTML_VALUE)
    public void shareProfilePreview(
        @PathVariable String username,
        HttpServletRequest request,
        HttpServletResponse response
    ) throws IOException {
        SharePreviewModel model = sharePreviewService.buildProfileModel(username, request);
        writeSharePreview(request, response, model, true);
    }

    private void writeSharePreview(
        HttpServletRequest request,
        HttpServletResponse response,
        SharePreviewModel model,
        boolean profile
    ) throws IOException {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String html = profile
            ? SharePreviewHtmlRenderer.renderProfile(model)
            : SharePreviewHtmlRenderer.render(model);

        if (sharePreviewService.isSocialCrawler(userAgent)) {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.TEXT_HTML_VALUE + ";charset=UTF-8");
            response.getWriter().write(html);
            return;
        }

        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader(HttpHeaders.LOCATION, model.redirectUrl());
        response.setContentType(MediaType.TEXT_HTML_VALUE + ";charset=UTF-8");
        response.getWriter().write(html);
    }
}
