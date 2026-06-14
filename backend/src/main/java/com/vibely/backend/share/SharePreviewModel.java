package com.vibely.backend.share;

record SharePreviewModel(
    String documentTitle,
    String headline,
    String description,
    String pageUrl,
    String redirectUrl,
    String imageUrl,
    String siteName
) {}
