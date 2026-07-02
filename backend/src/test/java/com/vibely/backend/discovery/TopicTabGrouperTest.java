package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;

import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.service.TopicTabGrouper;
import com.vibely.backend.user.entity.User;
import java.util.List;
import org.junit.jupiter.api.Test;

class TopicTabGrouperTest {
    private final TopicTabGrouper grouper = new TopicTabGrouper();

    @Test
    void groupsTechnologyToolTopicsIntoAiAndProgramming() {
        User user = new User();
        List<UserTopicInterest> interests = List.of(
            interest(user, topic("chatgpt", "ChatGPT"), 0.96),
            interest(user, topic("cursor", "Cursor"), 0.91),
            interest(user, topic("springboot", "Spring Boot"), 0.88)
        );

        var grouped = grouper.groupInterests(interests);

        assertThat(grouped).containsKeys("ai", "programming");
        assertThat(grouped.get("ai").aggregatedScore()).isGreaterThan(1.5);
        assertThat(grouped.get("programming").displayName()).isEqualTo("Programming");
    }

    private static UserTopicInterest interest(User user, Topic topic, double score) {
        UserTopicInterest row = new UserTopicInterest(user, topic);
        row.setScore(score);
        return row;
    }

    private static Topic topic(String slug, String displayName) {
        Topic topic = new Topic();
        topic.setSlug(slug);
        topic.setDisplayName(displayName);
        return topic;
    }
}
