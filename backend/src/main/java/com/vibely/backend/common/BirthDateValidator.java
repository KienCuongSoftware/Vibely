package com.vibely.backend.common;

import java.time.LocalDate;

public final class BirthDateValidator {

    private BirthDateValidator() {
    }

    public static LocalDate validate(LocalDate birthDate) {
        if (birthDate == null) {
            throw new BadRequestException("Please select your date of birth");
        }
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today)) {
            throw new BadRequestException("Date of birth cannot be after today");
        }
        if (birthDate.isAfter(today.minusYears(18))) {
            throw new BadRequestException("You must be at least 18 years old to use Vibely");
        }
        if (birthDate.isBefore(LocalDate.of(1900, 1, 1))) {
            throw new BadRequestException("Invalid date of birth");
        }
        return birthDate;
    }
}
