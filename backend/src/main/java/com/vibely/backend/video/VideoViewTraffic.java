package com.vibely.backend.video;

import java.util.Locale;
import java.util.Set;

/** Chuẩn hoá nguồn traffic client gửi khi ghi lượt xem. */
public final class VideoViewTraffic {

    public static final String FOR_YOU = "foryou";
    public static final String PROFILE = "profile";
    public static final String SEARCH = "search";
    public static final String OTHER = "other";

    public static final int SEARCH_QUERY_MAX = 80;

    private static final Set<String> ALLOWED = Set.of(FOR_YOU, PROFILE, SEARCH, OTHER);

    private VideoViewTraffic() {}

    public static String normalizeSource(String raw) {
        if (raw == null) {
            return OTHER;
        }
        String source = raw.trim().toLowerCase(Locale.ROOT);
        return ALLOWED.contains(source) ? source : OTHER;
    }

    public static String normalizeSearchQuery(String source, String raw) {
        if (!SEARCH.equals(source) || raw == null) {
            return null;
        }
        StringBuilder out = new StringBuilder(raw.length());
        boolean pendingSpace = false;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c <= 31 || c == 127) {
                pendingSpace = out.length() > 0;
                continue;
            }
            if (Character.isWhitespace(c)) {
                pendingSpace = out.length() > 0;
                continue;
            }
            if (pendingSpace) {
                out.append(' ');
                pendingSpace = false;
            }
            out.append(c);
            if (out.length() >= SEARCH_QUERY_MAX) {
                break;
            }
        }
        return out.isEmpty() ? null : out.toString();
    }
}
