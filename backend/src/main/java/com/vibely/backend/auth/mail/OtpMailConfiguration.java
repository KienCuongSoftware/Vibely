package com.vibely.backend.auth.mail;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(OtpMailProperties.class)
public class OtpMailConfiguration {
}
