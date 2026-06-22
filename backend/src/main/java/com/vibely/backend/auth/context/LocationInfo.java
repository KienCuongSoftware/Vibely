package com.vibely.backend.auth.context;

public record LocationInfo(
    String country,
    String province,
    String city,
    String district,
    String ward
) {
    public static LocationInfo unknown() {
        return new LocationInfo("Không xác định", null, null, null, null);
    }

    public boolean hasPreciseLocation() {
        return district != null || ward != null;
    }

    public String display() {
        StringBuilder builder = new StringBuilder();
        append(builder, ward);
        append(builder, district);
        append(builder, city);
        append(builder, province);
        append(builder, country);
        return builder.isEmpty() ? "Không xác định" : builder.toString();
    }

    private static void append(StringBuilder builder, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (builder.indexOf(value) >= 0) {
            return;
        }
        if (!builder.isEmpty()) {
            builder.append("\n");
        }
        builder.append(value);
    }
}
