package com.vibely.backend.discovery.model;

import java.io.Serializable;
import java.util.Objects;

public class TopicCategoryMappingId implements Serializable {
    private Long category;
    private Long topic;

    public TopicCategoryMappingId() {
    }

    public TopicCategoryMappingId(Long category, Long topic) {
        this.category = category;
        this.topic = topic;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TopicCategoryMappingId that)) {
            return false;
        }
        return Objects.equals(category, that.category) && Objects.equals(topic, that.topic);
    }

    @Override
    public int hashCode() {
        return Objects.hash(category, topic);
    }
}
