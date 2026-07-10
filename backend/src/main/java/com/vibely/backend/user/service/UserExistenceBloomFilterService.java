package com.vibely.backend.user.service;

import com.vibely.backend.common.bloom.BloomFilter;
import com.vibely.backend.user.repository.UserRepository;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class UserExistenceBloomFilterService {

    private static final Logger log = LoggerFactory.getLogger(UserExistenceBloomFilterService.class);
    private static final double FALSE_POSITIVE_RATE = 0.01;

    private final UserRepository userRepository;
    private volatile BloomFilter emailFilter;
    private volatile BloomFilter usernameFilter;

    public UserExistenceBloomFilterService(UserRepository userRepository) {
        this.userRepository = userRepository;
        int initialCapacity = Math.max((int) userRepository.count() * 2, 256);
        emailFilter = BloomFilter.create(initialCapacity, FALSE_POSITIVE_RATE);
        usernameFilter = BloomFilter.create(initialCapacity, FALSE_POSITIVE_RATE);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void rebuildOnStartup() {
        rebuild();
    }

    public synchronized void rebuild() {
        long count = userRepository.count();
        int capacity = Math.max((int) count * 2, 256);
        BloomFilter nextEmailFilter = BloomFilter.create(capacity, FALSE_POSITIVE_RATE);
        BloomFilter nextUsernameFilter = BloomFilter.create(capacity, FALSE_POSITIVE_RATE);

        List<String> emails = userRepository.findAllEmails();
        for (String email : emails) {
            String normalized = normalizeEmail(email);
            if (!normalized.isBlank()) {
                nextEmailFilter.add(normalized);
            }
        }

        List<String> usernames = userRepository.findAllUsernames();
        for (String username : usernames) {
            String normalized = normalizeUsername(username);
            if (!normalized.isBlank()) {
                nextUsernameFilter.add(normalized);
            }
        }

        emailFilter = nextEmailFilter;
        usernameFilter = nextUsernameFilter;
        log.info("Rebuilt user existence bloom filters with {} emails and {} usernames", emails.size(), usernames.size());
    }

    public boolean mightContainEmail(String email) {
        return emailFilter.mightContain(normalizeEmail(email));
    }

    public boolean mightContainUsername(String username) {
        return usernameFilter.mightContain(normalizeUsername(username));
    }

    public synchronized void registerEmail(String email) {
        emailFilter.add(normalizeEmail(email));
    }

    public synchronized void registerUsername(String username) {
        usernameFilter.add(normalizeUsername(username));
    }

    public void registerUser(String email, String username) {
        registerEmail(email);
        registerUsername(username);
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUsername(String username) {
        if (username == null) {
            return "";
        }
        String normalized = username.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
}
