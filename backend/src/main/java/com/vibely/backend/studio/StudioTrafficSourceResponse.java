package com.vibely.backend.studio;

/** Nguồn traffic; percent null khi chưa có dữ liệu thu thập. */
public record StudioTrafficSourceResponse(String id, String label, Double percent) {}
