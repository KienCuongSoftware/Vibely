package com.vibely.backend.user.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vibely.backend.common.BadRequestException;
import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.dto.CreateDataExportRequest;
import com.vibely.backend.user.dto.DataExportRequestResponse;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.entity.UserDataExportRequest;
import com.vibely.backend.user.repository.UserDataExportRequestRepository;
import com.vibely.backend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserDataExportService {

    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_READY = "READY";

    private static final Set<String> ALLOWED_FORMATS = Set.of("TXT", "JSON");
    private static final Set<String> ALLOWED_CATEGORIES = Set.of(
        "posts",
        "comments",
        "activity",
        "profile",
        "likes",
        "direct_messages",
        "live",
        "shop",
        "reviews",
        "income"
    );

    private final UserRepository userRepository;
    private final UserDataExportRequestRepository exportRequestRepository;
    private final ObjectMapper objectMapper;

    public UserDataExportService(
        UserRepository userRepository,
        UserDataExportRequestRepository exportRequestRepository,
        ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.exportRequestRepository = exportRequestRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<DataExportRequestResponse> list(String email) {
        User user = requireUser(email);
        return exportRequestRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public DataExportRequestResponse create(String email, CreateDataExportRequest request) {
        User user = requireUser(email);
        if (exportRequestRepository.existsByUserAndStatus(user, STATUS_PROCESSING)) {
            throw new BadRequestException("You already have a data request being processed.");
        }
        String format = normalizeFormat(request == null ? null : request.format());
        List<String> categories = normalizeCategories(request == null ? null : request.categories());
        if (categories.isEmpty()) {
            throw new BadRequestException("Please select at least one data type to download.");
        }

        UserDataExportRequest entity = new UserDataExportRequest();
        entity.setUser(user);
        entity.setFormat(format);
        entity.setCategories(writeCategories(categories));
        entity.setStatus(STATUS_PROCESSING);
        return toResponse(exportRequestRepository.save(entity));
    }

    @Transactional
    public DataExportRequestResponse cancel(String email, Long requestId) {
        User user = requireUser(email);
        UserDataExportRequest entity = exportRequestRepository.findByIdAndUser(requestId, user)
            .orElseThrow(() -> new NotFoundException("Data request not found"));
        if (!STATUS_PROCESSING.equals(entity.getStatus())) {
            throw new BadRequestException("Only requests that are being processed can be cancelled.");
        }
        entity.setStatus(STATUS_CANCELLED);
        entity.setCancelledAt(LocalDateTime.now());
        return toResponse(exportRequestRepository.save(entity));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private String normalizeFormat(String raw) {
        String format = StringUtils.hasText(raw) ? raw.trim().toUpperCase(Locale.ROOT) : "TXT";
        if (!ALLOWED_FORMATS.contains(format)) {
            throw new BadRequestException("Invalid file format");
        }
        return format;
    }

    private List<String> normalizeCategories(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> out = new LinkedHashSet<>();
        for (String item : raw) {
            if (!StringUtils.hasText(item)) {
                continue;
            }
            String code = item.trim().toLowerCase(Locale.ROOT);
            if (!ALLOWED_CATEGORIES.contains(code)) {
                throw new BadRequestException("Invalid data type: " + item);
            }
            out.add(code);
        }
        return new ArrayList<>(out);
    }

    private String writeCategories(List<String> categories) {
        try {
            return objectMapper.writeValueAsString(categories);
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Could not save data categories");
        }
    }

    private List<String> readCategories(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private DataExportRequestResponse toResponse(UserDataExportRequest entity) {
        return new DataExportRequestResponse(
            entity.getId(),
            entity.getFormat(),
            readCategories(entity.getCategories()),
            entity.getStatus(),
            entity.getCreatedAt(),
            entity.getCancelledAt()
        );
    }
}
