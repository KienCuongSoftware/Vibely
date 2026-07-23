package com.vibely.backend.translation;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DescriptionTranslationRepository extends JpaRepository<DescriptionTranslationEntity, Long> {

    Optional<DescriptionTranslationEntity> findByVideoIdAndSourceHashAndTargetLang(
        Long videoId,
        String sourceHash,
        String targetLang
    );
}
