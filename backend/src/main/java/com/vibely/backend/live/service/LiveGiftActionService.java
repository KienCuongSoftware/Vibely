package com.vibely.backend.live.service;

import com.vibely.backend.live.dto.LiveGiftRequest;
import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.entity.LiveStatus;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.live.gift.GiftService;
import com.vibely.backend.live.gift.LiveGift;
import com.vibely.backend.user.entity.User;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/** LIVE-side rules for gifting; the money movement itself belongs to {@link GiftService}. */
@Service
public class LiveGiftActionService {

    private final LiveActorResolver actorResolver;
    private final LiveAccessService accessService;
    private final GiftService giftService;

    public LiveGiftActionService(LiveActorResolver actorResolver, LiveAccessService accessService, GiftService giftService) {
        this.actorResolver = actorResolver;
        this.accessService = accessService;
        this.giftService = giftService;
    }

    public List<LiveGift> catalog() {
        return giftService.catalog();
    }

    public LiveGift send(Authentication authentication, String liveId, LiveGiftRequest request) {
        User sender = actorResolver.require(authentication);
        Live live = accessService.requireViewable(liveId, sender);
        if (live.getStatus() != LiveStatus.LIVE) {
            throw new LiveException(LiveErrorCode.LIVE_NOT_ACTIVE);
        }
        if (!giftService.isAvailable()) {
            throw new LiveException(LiveErrorCode.GIFTS_UNAVAILABLE);
        }
        if (!live.isAllowGifts()) {
            throw new LiveException(LiveErrorCode.GIFTS_UNAVAILABLE, "Gifts are turned off for this LIVE");
        }
        if (live.isHostedBy(sender)) {
            throw new LiveException(LiveErrorCode.INVALID_LIVE_STATE, "You cannot send gifts to your own LIVE");
        }
        int quantity = request.quantity() == null ? 1 : request.quantity();
        return giftService.send(live, sender, request.giftId().trim(), quantity);
    }
}
