package com.vibely.backend.common.bloom;

import java.nio.charset.StandardCharsets;
import java.util.BitSet;

/**
 * Simple in-memory Bloom filter for fast negative lookups.
 */
public final class BloomFilter {

    private final BitSet bits;
    private final int bitSize;
    private final int hashFunctions;

    private BloomFilter(int bitSize, int hashFunctions) {
        this.bitSize = Math.max(bitSize, 64);
        this.hashFunctions = Math.max(hashFunctions, 1);
        this.bits = new BitSet(this.bitSize);
    }

    public static BloomFilter create(int expectedInsertions, double falsePositiveProbability) {
        int safeExpected = Math.max(expectedInsertions, 1);
        double safeFpp = falsePositiveProbability <= 0 ? 0.01 : falsePositiveProbability;
        int bitSize = optimalNumOfBits(safeExpected, safeFpp);
        int hashFunctions = optimalNumOfHashFunctions(safeExpected, bitSize);
        return new BloomFilter(bitSize, hashFunctions);
    }

    public void add(String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        for (int i = 0; i < hashFunctions; i++) {
            bits.set(indexFor(value, i));
        }
    }

    public boolean mightContain(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        for (int i = 0; i < hashFunctions; i++) {
            if (!bits.get(indexFor(value, i))) {
                return false;
            }
        }
        return true;
    }

    private int indexFor(String value, int hashIndex) {
        int hash = murmurHash(value, hashIndex);
        return Math.floorMod(hash, bitSize);
    }

    private static int murmurHash(String value, int seed) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        int hash = seed;
        for (byte b : bytes) {
            hash = 31 * hash + (b & 0xff);
            hash ^= (hash >>> 16);
            hash *= 0x85ebca6b;
            hash ^= (hash >>> 13);
            hash *= 0xc2b2ae35;
            hash ^= (hash >>> 16);
        }
        return hash;
    }

    private static int optimalNumOfBits(int expectedInsertions, double fpp) {
        double bits = -expectedInsertions * Math.log(fpp) / (Math.log(2) * Math.log(2));
        return (int) Math.ceil(bits);
    }

    private static int optimalNumOfHashFunctions(int expectedInsertions, int bitSize) {
        double functions = (bitSize / (double) expectedInsertions) * Math.log(2);
        return Math.max(1, (int) Math.round(functions));
    }
}
