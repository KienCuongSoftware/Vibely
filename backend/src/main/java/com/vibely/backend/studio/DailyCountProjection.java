package com.vibely.backend.studio;

import java.time.LocalDate;

public interface DailyCountProjection {
    LocalDate getDay();
    long getTotal();
}
