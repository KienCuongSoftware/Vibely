package com.vibely.backend.contentunderstanding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "category_tag_mapping")
public class CategoryTagMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "tag_id", nullable = false)
    private Long tagId;

    @Column(name = "weight", nullable = false)
    private float weight = 1.0f;

    @Column(name = "priority", nullable = false)
    private int priority = 100;

    @Column(name = "rule", nullable = false, length = 32)
    private String rule = "weighted_sum";

    @Column(name = "min_tag_confidence", nullable = false)
    private float minTagConfidence = 0.40f;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public Long getTagId() {
        return tagId;
    }

    public void setTagId(Long tagId) {
        this.tagId = tagId;
    }

    public float getWeight() {
        return weight;
    }

    public void setWeight(float weight) {
        this.weight = weight;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public String getRule() {
        return rule;
    }

    public void setRule(String rule) {
        this.rule = rule;
    }

    public float getMinTagConfidence() {
        return minTagConfidence;
    }

    public void setMinTagConfidence(float minTagConfidence) {
        this.minTagConfidence = minTagConfidence;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
