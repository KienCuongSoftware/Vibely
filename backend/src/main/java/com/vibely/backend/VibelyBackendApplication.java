package com.vibely.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class VibelyBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(VibelyBackendApplication.class, args);
	}

}
