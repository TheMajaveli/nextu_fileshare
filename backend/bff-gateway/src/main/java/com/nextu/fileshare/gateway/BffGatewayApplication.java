package com.nextu.fileshare.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the BFF gateway that fronts OAuth2 login and API proxying.
 */
@SpringBootApplication
public class BffGatewayApplication {

    /** Starts the BFF gateway application. */
    public static void main(String[] args) {
        SpringApplication.run(BffGatewayApplication.class, args);
    }
}
