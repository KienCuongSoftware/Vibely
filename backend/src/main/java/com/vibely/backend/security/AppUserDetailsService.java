package com.vibely.backend.security;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.entity.Role;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = resolveUserForLoginIdentifier(identifier)
            .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng"));
        String[] authorities = user.getRole() == Role.ADMIN
            ? new String[] { "ROLE_ADMIN", "ROLE_USER" }
            : new String[] { "ROLE_" + user.getRole().name() };
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            user.isActive(),
            true,
            true,
            true,
            AuthorityUtils.createAuthorityList(authorities)
        );
    }

    private Optional<User> resolveUserForLoginIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String normalized = identifier.trim().toLowerCase(Locale.ROOT);
        Optional<User> byEmail = userRepository.findByEmail(normalized);
        if (byEmail.isPresent()) {
            return byEmail;
        }
        String username = normalized.startsWith("@") ? normalized.substring(1) : normalized;
        return userRepository.findByUsername(username);
    }

    public User loadDomainUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }
}
