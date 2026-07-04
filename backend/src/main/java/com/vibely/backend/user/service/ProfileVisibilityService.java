package com.vibely.backend.user.service;

import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.entity.User;
import org.springframework.stereotype.Service;

@Service
public class ProfileVisibilityService {

    private final FollowRepository followRepository;

    public ProfileVisibilityService(FollowRepository followRepository) {
        this.followRepository = followRepository;
    }

    public boolean canViewProfileContent(User profileOwner, User viewer) {
        if (profileOwner == null) {
            return false;
        }
        if (!profileOwner.isPrivateAccount()) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        if (viewer.getId().equals(profileOwner.getId())) {
            return true;
        }
        return followRepository.existsAcceptedByFollowerAndFollowing(viewer, profileOwner);
    }

    public boolean isAcceptedFollower(User profileOwner, User viewer) {
        if (profileOwner == null || viewer == null) {
            return false;
        }
        if (viewer.getId().equals(profileOwner.getId())) {
            return true;
        }
        return followRepository.existsAcceptedByFollowerAndFollowing(viewer, profileOwner);
    }

    public boolean hasPendingFollowRequest(User profileOwner, User viewer) {
        if (profileOwner == null || viewer == null) {
            return false;
        }
        return followRepository.existsPendingByFollowerAndFollowing(viewer, profileOwner);
    }
}
