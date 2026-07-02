package com.vibely.backend.interaction.repository;

import com.vibely.backend.interaction.entity.CommentEntity;
import com.vibely.backend.interaction.entity.CommentLikeEntity;
import com.vibely.backend.user.entity.User;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentLikeRepository extends JpaRepository<CommentLikeEntity, Long> {
    boolean existsByUserAndComment(User user, CommentEntity comment);

    void deleteByUserAndComment(User user, CommentEntity comment);

    @Query(
        "SELECT cl.comment.id, COUNT(cl) FROM CommentLikeEntity cl WHERE cl.comment.id IN :ids GROUP BY cl.comment.id"
    )
    List<Object[]> countGroupedByCommentIds(@Param("ids") Collection<Long> ids);

    @Query(
        "SELECT cl.comment.id FROM CommentLikeEntity cl WHERE cl.user = :user AND cl.comment.id IN :ids"
    )
    List<Long> findLikedCommentIds(@Param("user") User user, @Param("ids") Collection<Long> ids);
}
