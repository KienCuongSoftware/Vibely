package com.vibely.backend.enhancement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "enhancement_rules")
public class EnhancementRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false)
    private int priority;

    @Column(name = "predicate_json", nullable = false, columnDefinition = "TEXT")
    private String predicateJson;

    @Column(name = "action_json", nullable = false, columnDefinition = "TEXT")
    private String actionJson;

    @Column(name = "cooldown_hours", nullable = false)
    private int cooldownHours;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getPriority() {
        return priority;
    }

    public String getPredicateJson() {
        return predicateJson;
    }

    public String getActionJson() {
        return actionJson;
    }

    public int getCooldownHours() {
        return cooldownHours;
    }
}
