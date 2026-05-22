package com.vibely.backend.share.redis;

import io.lettuce.core.resource.DefaultClientResources;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
@EnableConfigurationProperties(RedisProperties.class)
public class ShareRedisConfiguration {

    @Bean(destroyMethod = "shutdown")
    DefaultClientResources shareRedisClientResources() {
        return DefaultClientResources.create();
    }

    @Bean
    LettuceConnectionFactory shareRedisConnectionFactory(
        RedisProperties redisProperties,
        DefaultClientResources clientResources
    ) {
        RedisStandaloneConfiguration standalone = new RedisStandaloneConfiguration();
        standalone.setHostName(redisProperties.getHost());
        standalone.setPort(redisProperties.getPort());
        if (redisProperties.getPassword() != null && !redisProperties.getPassword().isBlank()) {
            standalone.setPassword(RedisPassword.of(redisProperties.getPassword()));
        }
        if (redisProperties.getDatabase() != 0) {
            standalone.setDatabase(redisProperties.getDatabase());
        }

        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .clientResources(clientResources)
            .commandTimeout(redisProperties.getTimeout())
            .build();

        LettuceConnectionFactory factory = new LettuceConnectionFactory(standalone, clientConfig);
        factory.afterPropertiesSet();
        return factory;
    }

    @Bean
    StringRedisTemplate shareStringRedisTemplate(LettuceConnectionFactory shareRedisConnectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate();
        template.setConnectionFactory(shareRedisConnectionFactory);
        template.afterPropertiesSet();
        return template;
    }
}
