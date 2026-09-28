package com.vibely.backend.live.gift;

/** Catalog item a viewer can send during a LIVE. */
public record LiveGift(String id, String name, long coinCost, String iconUrl) {}
