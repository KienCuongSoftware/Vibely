package com.vibely.backend.storage;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(S3Properties.class)
public class S3UploadConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
    S3Presigner s3Presigner(S3Properties properties) {
        S3Presigner.Builder builder = S3Presigner.builder().region(Region.of(properties.getRegion()));
        applyCredentialsToPresigner(builder, properties);
        return builder.build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.s3", name = "enabled", havingValue = "true")
    S3Client s3Client(S3Properties properties) {
        software.amazon.awssdk.services.s3.S3ClientBuilder builder =
            S3Client.builder().region(Region.of(properties.getRegion()));
        applyCredentialsToS3Client(builder, properties);
        return builder.build();
    }

    private static void applyCredentialsToPresigner(S3Presigner.Builder builder, S3Properties properties) {
        String ak = properties.getAccessKeyId();
        String sk = properties.getSecretAccessKey();
        if (ak != null && !ak.isBlank() && sk != null && !sk.isBlank()) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(ak.trim(), sk.trim()))
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }
    }

    private static void applyCredentialsToS3Client(
        software.amazon.awssdk.services.s3.S3ClientBuilder builder,
        S3Properties properties
    ) {
        String ak = properties.getAccessKeyId();
        String sk = properties.getSecretAccessKey();
        if (ak != null && !ak.isBlank() && sk != null && !sk.isBlank()) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(AwsBasicCredentials.create(ak.trim(), sk.trim()))
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }
    }
}
