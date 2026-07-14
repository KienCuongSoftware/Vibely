package com.vibely.backend.video.service;

import com.vibely.backend.interaction.repository.FollowRepository;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoPrivacy;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class VideoPrivacyAccessService {

    private final FollowRepository followRepository;

    public VideoPrivacyAccessService(FollowRepository followRepository) {
        this.followRepository = followRepository;
    }

    public boolean isMutualFriends(User a, User b) {
        if (a == null || b == null || Objects.equals(a.getId(), b.getId())) {
            return false;
        }
        return followRepository.existsAcceptedByFollowerAndFollowing(a, b)
            && followRepository.existsAcceptedByFollowerAndFollowing(b, a);
    }

    /**
     * Whether {@code viewer} may watch this video (author always can).
     * {@code viewer == null} means anonymous.
     */
    public boolean canViewerWatch(Video video, User viewer) {
        if (video == null) {
            return false;
        }
        User author = video.getAuthor();
        if (viewer != null && Objects.equals(viewer.getId(), author.getId())) {
            return true;
        }
        VideoPrivacy privacy = video.getPrivacy() == null ? VideoPrivacy.PUBLIC : video.getPrivacy();
        return switch (privacy) {
            case PUBLIC -> true;
            case FRIENDS -> viewer != null && isMutualFriends(viewer, author);
            case PRIVATE -> false;
        };
    }
}
