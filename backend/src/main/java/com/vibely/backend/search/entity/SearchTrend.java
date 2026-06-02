package com.vibely.backend.search.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "search_trends")
public class SearchTrend {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200, unique = true)
    private String keyword;

    @Column(name = "search_count", nullable = false)
    private long searchCount = 1L;

    @Column(name = "last_searched_at", nullable = false)
    private LocalDateTime lastSearchedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (lastSearchedAt == null) {
            lastSearchedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        lastSearchedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public long getSearchCount() {
        return searchCount;
    }

    public void setSearchCount(long searchCount) {
        this.searchCount = searchCount;
    }

    public LocalDateTime getLastSearchedAt() {
        return lastSearchedAt;
    }

    public void setLastSearchedAt(LocalDateTime lastSearchedAt) {
        this.lastSearchedAt = lastSearchedAt;
    }

    public void incrementSearchCount() {
        this.searchCount += 1L;
        this.lastSearchedAt = LocalDateTime.now();
    }
}
