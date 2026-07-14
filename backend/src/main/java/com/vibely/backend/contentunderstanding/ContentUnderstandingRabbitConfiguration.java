package com.vibely.backend.contentunderstanding;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "app.content-understanding", name = "rabbitmq-enabled", havingValue = "true")
public class ContentUnderstandingRabbitConfiguration {

    @Bean
    ConnectionFactory cuRabbitConnectionFactory(
        @Value("${spring.rabbitmq.host:localhost}") String host,
        @Value("${spring.rabbitmq.port:5672}") int port,
        @Value("${spring.rabbitmq.username:guest}") String username,
        @Value("${spring.rabbitmq.password:guest}") String password
    ) {
        CachingConnectionFactory factory = new CachingConnectionFactory(host, port);
        factory.setUsername(username);
        factory.setPassword(password);
        return factory;
    }

    @Bean
    RabbitAdmin cuRabbitAdmin(ConnectionFactory cuRabbitConnectionFactory) {
        return new RabbitAdmin(cuRabbitConnectionFactory);
    }

    @Bean
    RabbitTemplate rabbitTemplate(ConnectionFactory cuRabbitConnectionFactory) {
        return new RabbitTemplate(cuRabbitConnectionFactory);
    }

    @Bean
    TopicExchange contentTopicExchange(ContentUnderstandingProperties properties) {
        return new TopicExchange(properties.getExchange(), true, false);
    }

    @Bean
    Queue cuAnalyzeQueue(ContentUnderstandingProperties properties) {
        return new Queue(properties.getQueueAnalyze(), true);
    }

    @Bean
    Binding cuAnalyzeBinding(
        Queue cuAnalyzeQueue,
        TopicExchange contentTopicExchange,
        ContentUnderstandingProperties properties
    ) {
        return BindingBuilder
            .bind(cuAnalyzeQueue)
            .to(contentTopicExchange)
            .with(properties.getRoutingKeyAnalyze());
    }
}
