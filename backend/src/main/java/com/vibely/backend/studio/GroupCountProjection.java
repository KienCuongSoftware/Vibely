package com.vibely.backend.studio;

/** Đếm theo nhóm chuỗi (khu vực, kênh chia sẻ…). */
public interface GroupCountProjection {
    String getGroupKey();

    long getTotal();
}
