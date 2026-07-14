package com.vibely.backend.contentunderstanding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "semantic_tag_aliases")
public class SemanticTagAliasEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tag_id", nullable = false)
    private SemanticTagEntity tag;

    @Column(name = "alias", nullable = false, length = 128)
    private String alias;

    @Column(name = "language", nullable = false, length = 8)
    private String language = "und";

    public SemanticTagEntity getTag() {
        return tag;
    }

    public String getAlias() {
        return alias;
    }
}
