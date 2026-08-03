package com.vibely.backend.enhancement;

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
@ConditionalOnProperty(prefix = "app.enhancement", name = "rabbitmq-enabled", havingValue = "true")
public class EnhancementRabbitConfiguration {

    @Bean
    ConnectionFactory enhanceRabbitConnectionFactory(
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
    RabbitAdmin enhanceRabbitAdmin(ConnectionFactory enhanceRabbitConnectionFactory) {
        return new RabbitAdmin(enhanceRabbitConnectionFactory);
    }

    @Bean
    RabbitTemplate enhanceRabbitTemplate(ConnectionFactory enhanceRabbitConnectionFactory) {
        return new RabbitTemplate(enhanceRabbitConnectionFactory);
    }

    @Bean
    TopicExchange enhanceTopicExchange(EnhancementProperties properties) {
        return new TopicExchange(properties.getExchange(), true, false);
    }

    @Bean
    Queue enhanceWorkQueue(EnhancementProperties properties) {
        return new Queue(properties.getQueue(), true);
    }

    @Bean
    Binding enhanceWorkBinding(
        Queue enhanceWorkQueue,
        TopicExchange enhanceTopicExchange,
        EnhancementProperties properties
    ) {
        return BindingBuilder
            .bind(enhanceWorkQueue)
            .to(enhanceTopicExchange)
            .with(properties.getRoutingKey());
    }
}
