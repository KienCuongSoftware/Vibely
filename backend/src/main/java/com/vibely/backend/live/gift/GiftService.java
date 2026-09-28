package com.vibely.backend.live.gift;

import com.vibely.backend.live.entity.Live;
import com.vibely.backend.user.entity.User;
import java.util.List;

/**
 * Gift boundary for LIVE. A real implementation needs a wallet/coin ledger and a payment provider;
 * until then {@link UnavailableGiftService} is active and clients hide the gift UI when
 * {@link #isAvailable()} is false.
 */
public interface GiftService {

    boolean isAvailable();

    List<LiveGift> catalog();

    /** Debits the sender and credits the host atomically, then returns the gift that was sent. */
    LiveGift send(Live live, User sender, String giftId, int quantity);
}
