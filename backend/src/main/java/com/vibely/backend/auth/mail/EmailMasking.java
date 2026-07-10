package com.vibely.backend.auth.mail;

public final class EmailMasking {

    private EmailMasking() {
    }

    public static String mask(String email) {
        if (email == null || !email.contains("@")) {
            return "";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.isEmpty()) {
            return "***" + domain;
        }
        if (local.length() == 1) {
            return "*" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
