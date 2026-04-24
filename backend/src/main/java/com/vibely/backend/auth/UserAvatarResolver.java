package com.vibely.backend.auth;

import com.vibely.backend.user.User;
import org.springframework.stereotype.Component;

@Component
public class UserAvatarResolver {

    public static final String DEFAULT_AVATAR_URL = "/images/users/default-avatar.jpeg";

    public String resolve(User user) {
        return user.resolveAvatarUrl(DEFAULT_AVATAR_URL);
    }
}
