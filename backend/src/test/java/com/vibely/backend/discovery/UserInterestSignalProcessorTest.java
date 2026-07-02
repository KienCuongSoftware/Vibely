package com.vibely.backend.discovery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vibely.backend.discovery.config.DiscoveryProperties;
import com.vibely.backend.discovery.model.Topic;
import com.vibely.backend.discovery.model.UserTopicInterest;
import com.vibely.backend.discovery.model.VideoTopic;
import com.vibely.backend.discovery.repository.UserTopicInterestRepository;
import com.vibely.backend.discovery.repository.VideoTopicRepository;
import com.vibely.backend.discovery.service.UserInterestSignalProcessor;
import com.vibely.backend.user.entity.User;
import com.vibely.backend.user.repository.UserRepository;
import com.vibely.backend.video.Video;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserInterestSignalProcessorTest {
    @Mock
    private UserTopicInterestRepository userTopicInterestRepository;
    @Mock
    private VideoTopicRepository videoTopicRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private Video video;
    @Mock
    private Topic animeTopic;

    private UserInterestSignalProcessor processor;
    private User user;

    @BeforeEach
    void setUp() {
        processor = new UserInterestSignalProcessor(
            new DiscoveryProperties(),
            userTopicInterestRepository,
            videoTopicRepository,
            userRepository
        );
        when(video.getId()).thenReturn(10L);
        when(animeTopic.getId()).thenReturn(5L);
    }

    @Test
    void highCompletionWatchBoostsTopicInterest() {
        user = mock(User.class);
        VideoTopic videoTopic = mock(VideoTopic.class);
        when(videoTopic.getTopic()).thenReturn(animeTopic);
        when(videoTopic.getScore()).thenReturn(0.95);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(videoTopicRepository.findByVideoIdOrderByScoreDesc(10L)).thenReturn(List.of(videoTopic));
        when(userTopicInterestRepository.findByUserIdAndTopicId(1L, 5L)).thenReturn(Optional.empty());
        when(userTopicInterestRepository.save(any(UserTopicInterest.class))).thenAnswer(inv -> inv.getArgument(0));

        processor.onView(1L, video, 9500, 10000L);

        ArgumentCaptor<UserTopicInterest> captor = ArgumentCaptor.forClass(UserTopicInterest.class);
        verify(userTopicInterestRepository).save(captor.capture());
        assertThat(captor.getValue().getScore()).isGreaterThan(0.08);
    }

    @Test
    void skipWatchAppliesNegativeInterestDelta() {
        user = mock(User.class);
        VideoTopic videoTopic = mock(VideoTopic.class);
        when(videoTopic.getTopic()).thenReturn(animeTopic);
        when(videoTopic.getScore()).thenReturn(0.95);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(videoTopicRepository.findByVideoIdOrderByScoreDesc(10L)).thenReturn(List.of(videoTopic));
        UserTopicInterest existing = mock(UserTopicInterest.class);
        when(existing.getScore()).thenReturn(0.6);
        when(existing.getSignalCount()).thenReturn(3L);
        when(userTopicInterestRepository.findByUserIdAndTopicId(1L, 5L)).thenReturn(Optional.of(existing));
        when(userTopicInterestRepository.save(existing)).thenReturn(existing);

        processor.onView(1L, video, 500, 10000L);

        ArgumentCaptor<Double> scoreCaptor = ArgumentCaptor.forClass(Double.class);
        verify(existing).setScore(scoreCaptor.capture());
        assertThat(scoreCaptor.getValue()).isLessThan(0.6);
    }
}
