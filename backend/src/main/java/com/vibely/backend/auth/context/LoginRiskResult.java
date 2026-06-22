package com.vibely.backend.auth.context;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class LoginRiskResult {

    private final List<String> reasons = new ArrayList<>();

    public void add(String reason) {
        reasons.add(reason);
    }

    public boolean suspicious() {
        return !reasons.isEmpty();
    }

    public List<String> reasons() {
        return Collections.unmodifiableList(reasons);
    }
}
