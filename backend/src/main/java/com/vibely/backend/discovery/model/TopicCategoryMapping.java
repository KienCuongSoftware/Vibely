package com.vibely.backend.discovery.model;

import com.vibely.backend.explore.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "topic_category_mapping")
@IdClass(TopicCategoryMappingId.class)
public class TopicCategoryMapping {
    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false)
    private double weight = 1.0;

    public Category getCategory() {
        return category;
    }

    public Topic getTopic() {
        return topic;
    }

    public double getWeight() {
        return weight;
    }
}
