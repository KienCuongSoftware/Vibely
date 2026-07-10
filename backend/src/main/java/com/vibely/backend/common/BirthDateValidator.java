package com.vibely.backend.common;

import java.time.LocalDate;

public final class BirthDateValidator {

    private BirthDateValidator() {
    }

    public static LocalDate validate(LocalDate birthDate) {
        if (birthDate == null) {
            throw new BadRequestException("Vui lòng chọn ngày sinh");
        }
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today)) {
            throw new BadRequestException("Ngày sinh không thể sau ngày hiện tại");
        }
        if (birthDate.isAfter(today.minusYears(18))) {
            throw new BadRequestException("Bạn phải đủ 18 tuổi để sử dụng Vibely");
        }
        if (birthDate.isBefore(LocalDate.of(1900, 1, 1))) {
            throw new BadRequestException("Ngày sinh không hợp lệ");
        }
        return birthDate;
    }
}
