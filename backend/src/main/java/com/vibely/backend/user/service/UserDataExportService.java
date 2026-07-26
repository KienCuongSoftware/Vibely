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
            throw new BadRequestException("Bạn đã có một yêu cầu dữ liệu đang được xử lý.");
        }
        String format = normalizeFormat(request == null ? null : request.format());
        List<String> categories = normalizeCategories(request == null ? null : request.categories());
        if (categories.isEmpty()) {
            throw new BadRequestException("Hãy chọn ít nhất một loại dữ liệu để tải về.");
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
            .orElseThrow(() -> new NotFoundException("Không tìm thấy yêu cầu dữ liệu"));
        if (!STATUS_PROCESSING.equals(entity.getStatus())) {
            throw new BadRequestException("Chỉ có thể hủy yêu cầu đang được xử lý.");
        }
        entity.setStatus(STATUS_CANCELLED);
        entity.setCancelledAt(LocalDateTime.now());
        return toResponse(exportRequestRepository.save(entity));
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private String normalizeFormat(String raw) {
        String format = StringUtils.hasText(raw) ? raw.trim().toUpperCase(Locale.ROOT) : "TXT";
        if (!ALLOWED_FORMATS.contains(format)) {
            throw new BadRequestException("Định dạng tập tin không hợp lệ");
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
                throw new BadRequestException("Loại dữ liệu không hợp lệ: " + item);
            }
            out.add(code);
        }
        return new ArrayList<>(out);
    }

    private String writeCategories(List<String> categories) {
        try {
            return objectMapper.writeValueAsString(categories);
        } catch (JsonProcessingException ex) {
            throw new BadRequestException("Không thể lưu danh mục dữ liệu");
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
