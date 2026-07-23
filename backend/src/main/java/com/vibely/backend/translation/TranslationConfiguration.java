package com.vibely.backend.translation;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(TranslationProperties.class)
public class TranslationConfiguration {
}
