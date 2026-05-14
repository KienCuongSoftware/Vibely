package com.vibely.backend.processing;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableConfigurationProperties(ProcessingProperties.class)
@EnableAsync
public class ProcessingConfiguration {
}
