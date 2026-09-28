package com.vibely.backend.live.service;

import com.vibely.backend.common.UnauthorizedException;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Resolves the acting user from the security context (principal name is the account email). */
@Component
public class LiveActorResolver {

    private final UserRepository userRepository;

    public LiveActorResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> optional(Authentication authentication) {
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return findByPrincipalName(authentication.getName());
    }

    public User require(Authentication authentication) {
        return optional(authentication).orElseThrow(() -> new UnauthorizedException("Authentication required"));
    }

    public Optional<User> findByPrincipalName(String principalName) {
        if (principalName == null || principalName.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(principalName);
    }
}
