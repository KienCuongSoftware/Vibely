package com.vibely.backend.moderation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ModerationProperties.class)
public class ModerationConfiguration {
}
