package com.vibely.backend.antibot.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AntiBotProperties.class)
public class AntiBotConfiguration {
}
