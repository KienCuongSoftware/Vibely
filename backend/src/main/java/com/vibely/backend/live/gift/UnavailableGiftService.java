package com.vibely.backend.live.gift;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.live.exception.LiveErrorCode;
import com.vibely.backend.live.exception.LiveException;
import com.vibely.backend.user.entity.User;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Active until Vibely has a coin wallet. No balance is faked and nothing is persisted.
 * TODO(live-gifts): replace with a ledger-backed implementation (wallet + gift_transactions tables,
 * idempotency key per send, payment provider top-ups) and broadcast a GIFT_SENT event.
 */
@Service
public class UnavailableGiftService implements GiftService {

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public List<LiveGift> catalog() {
        return List.of();
    }

    @Override
    public LiveGift send(Live live, User sender, String giftId, int quantity) {
        throw new LiveException(LiveErrorCode.GIFTS_UNAVAILABLE);
    }
}
