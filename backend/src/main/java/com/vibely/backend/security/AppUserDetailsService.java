package com.vibely.backend.security;

import com.vibely.backend.common.NotFoundException;
import com.vibely.backend.user.User;
import com.vibely.backend.user.UserRepository;
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
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng"));
        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            AuthorityUtils.createAuthorityList("ROLE_" + user.getRole().name())
        );
    }

    public User loadDomainUserByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }
}
