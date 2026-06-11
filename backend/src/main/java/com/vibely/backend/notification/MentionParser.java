package com.vibely.backend.notification;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class MentionParser {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([A-Za-z0-9_.]+)");

    private MentionParser() {
    }

    static Set<String> extractUsernames(String content) {
        if (content == null || content.isBlank()) {
            return Set.of();
        }
        Matcher matcher = MENTION_PATTERN.matcher(content);
        Set<String> usernames = new LinkedHashSet<>();
        while (matcher.find()) {
            String username = matcher.group(1);
            if (username != null && !username.isBlank()) {
                usernames.add(username.trim());
            }
        }
        return usernames;
    }
}
