package com.vibely.backend.storage;

import com.vibely.backend.user.entity.User;
import com.vibely.backend.video.Video;
import com.vibely.backend.video.VideoRepository;
import com.vibely.backend.video.VideoStatus;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3MediaDeletionServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private VideoRepository videoRepository;

    private S3MediaDeletionService service;

    @BeforeEach
    void setUp() {
        S3Properties properties = new S3Properties();
        properties.setEnabled(true);
        properties.setBucket("vibely-dev");
        properties.setRegion("ap-southeast-2");
        properties.setPublicUrlBase("https://cdn.example.com");
        service = new S3MediaDeletionService(
            s3Client,
            properties,
            new S3ObjectUrlBuilder(properties),
            videoRepository
        );
    }

    @Test
    void deleteVideoArtifactsRemovesUploadThumbnailAudioAndHlsPrefix() {
        User author = new User();
        author.setId(42L);

        UUID publicId = UUID.fromString("0192a1b2-c3d4-7890-abcd-ef1234567890");
        Video video = mock(Video.class);
        when(video.getId()).thenReturn(7L);
        when(video.getAuthor()).thenReturn(author);
        when(video.getPublicId()).thenReturn(publicId);
        when(video.getVideoUrl()).thenReturn("https://cdn.example.com/uploads/42/raw.mp4");
        when(video.getThumbnailUrl()).thenReturn("https://cdn.example.com/thumbnails/42/thumb.jpg");
        when(video.getAudioUrl()).thenReturn("https://cdn.example.com/audios/42/raw.mp3");
        when(video.getMasterPlaylistUrl()).thenReturn(
            "https://cdn.example.com/hls/42/" + publicId + "/playlist.m3u8"
        );
        when(videoRepository.countByIdNotAndStatusNotAndAudioUrl(
            7L,
            VideoStatus.REMOVED,
            "https://cdn.example.com/audios/42/raw.mp3"
        )).thenReturn(0L);
        when(videoRepository.countByAuthor_IdAndStatusNotAndIdNot(42L, VideoStatus.REMOVED, 7L))
            .thenReturn(0L);

        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).thenAnswer(invocation -> {
            String prefix = invocation.getArgument(0, ListObjectsV2Request.class).prefix();
            if (prefix.contains(publicId.toString())) {
                return ListObjectsV2Response.builder()
                    .isTruncated(false)
                    .contents(
                        S3Object.builder().key("hls/42/" + publicId + "/playlist.m3u8").build(),
                        S3Object.builder().key("hls/42/" + publicId + "/720p/segment_000.ts").build()
                    )
                    .build();
            }
            return ListObjectsV2Response.builder().isTruncated(false).build();
        });
        when(s3Client.deleteObjects(any(DeleteObjectsRequest.class)))
            .thenReturn(DeleteObjectsResponse.builder().build());

        service.deleteVideoArtifacts(video);

        verify(s3Client).deleteObject(
            DeleteObjectRequest.builder()
                .bucket("vibely-dev")
                .key("uploads/42/raw.mp4")
                .build()
        );
        verify(s3Client).deleteObject(
            DeleteObjectRequest.builder()
                .bucket("vibely-dev")
                .key("thumbnails/42/thumb.jpg")
                .build()
        );
        verify(s3Client).deleteObject(
            DeleteObjectRequest.builder()
                .bucket("vibely-dev")
                .key("audios/42/raw.mp3")
                .build()
        );

        ArgumentCaptor<ListObjectsV2Request> listCaptor = ArgumentCaptor.forClass(ListObjectsV2Request.class);
        verify(s3Client, atLeastOnce()).listObjectsV2(listCaptor.capture());
        assertThat(listCaptor.getAllValues())
            .extracting(ListObjectsV2Request::prefix)
            .contains("hls/42/" + publicId + "/", "thumbnails/42/");

        verify(s3Client, atLeastOnce()).deleteObjects(any(DeleteObjectsRequest.class));
    }

    @Test
    void skipsSharedAudioTrack() {
        User author = new User();
        author.setId(42L);

        Video video = mock(Video.class);
        when(video.getId()).thenReturn(7L);
        when(video.getAuthor()).thenReturn(author);
        when(video.getPublicId()).thenReturn(UUID.randomUUID());
        when(video.getVideoUrl()).thenReturn("https://cdn.example.com/uploads/42/raw.mp4");
        when(video.getAudioUrl()).thenReturn("https://cdn.example.com/audios/42/shared.mp3");
        when(videoRepository.countByIdNotAndStatusNotAndAudioUrl(
            eq(7L),
            eq(VideoStatus.REMOVED),
            eq("https://cdn.example.com/audios/42/shared.mp3")
        )).thenReturn(2L);
        when(videoRepository.countByAuthor_IdAndStatusNotAndIdNot(42L, VideoStatus.REMOVED, 7L))
            .thenReturn(1L);
        when(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .thenReturn(ListObjectsV2Response.builder().isTruncated(false).build());

        service.deleteVideoArtifacts(video);

        verify(s3Client).deleteObject(
            DeleteObjectRequest.builder()
                .bucket("vibely-dev")
                .key("uploads/42/raw.mp4")
                .build()
        );
    }

    @Test
    void deriveAudioKeyFromUploadKey() {
        assertThat(S3MediaDeletionService.deriveAudioKeyFromUploadKey("uploads/42/video.mp4"))
            .isEqualTo("audios/42/video.mp3");
    }
}
