package com.nextu.fileshare.gateway.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.client.oidc.web.server.logout.OidcClientInitiatedServerLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ReactiveClientRegistrationRepository;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authentication.ServerAuthenticationSuccessHandler;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Configures WebFlux security, OAuth2 login, CORS, and session logout for the BFF.
 */
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfig {

    private final CorsProperties corsProperties;

    /** Creates the security configuration using CORS properties. */
    public SecurityConfig(CorsProperties corsProperties) {
        this.corsProperties = corsProperties;
    }

    @Bean
    SecurityWebFilterChain springSecurityFilterChain(
        ServerHttpSecurity http,
        ReactiveClientRegistrationRepository clientRegistrationRepository
    ) {
        OidcClientInitiatedServerLogoutSuccessHandler logoutSuccessHandler =
            new OidcClientInitiatedServerLogoutSuccessHandler(clientRegistrationRepository);
        String frontendOrigin = corsProperties.getAllowedOrigins().split(",")[0].trim();
        logoutSuccessHandler.setPostLogoutRedirectUri(frontendOrigin + "/login");

        http
            // CSRF disabled — mitigated by SameSite=Lax cookie + strict CORS origin; re-enable for non-SPA use
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint(frontendOrigin))
            )
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers("/oauth2/**", "/login/**", "/actuator/health").permitAll()
                .pathMatchers(HttpMethod.OPTIONS).permitAll()
                .pathMatchers("/api/**").authenticated()
                .anyExchange().permitAll()
            )
            .oauth2Login(oauth2 -> oauth2.authenticationSuccessHandler(loginSuccessHandler()))
            .oauth2Client(org.springframework.security.config.Customizer.withDefaults())
            .logout(logout -> logout
                .requiresLogout(ServerWebExchangeMatchers.pathMatchers("/logout"))
                .logoutSuccessHandler(logoutSuccessHandler)
            );

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(corsProperties.getAllowedOrigins().split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    ServerAuthenticationSuccessHandler loginSuccessHandler() {
        return (webFilterExchange, authentication) -> {
            ServerWebExchange exchange = webFilterExchange.getExchange();
            exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.FOUND);
            exchange.getResponse().getHeaders().setLocation(java.net.URI.create(corsProperties.getAllowedOrigins().split(",")[0].trim() + "/dashboard"));
            return exchange.getResponse().setComplete();
        };
    }

    private ServerAuthenticationEntryPoint authenticationEntryPoint(String frontendOrigin) {
        return (exchange, ex) -> {
            String path = exchange.getRequest().getPath().value();
            if (path.startsWith("/api/")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                byte[] body = """
                    {"error":"UNAUTHORIZED","message":"Session expirée ou non authentifiée."}
                    """.strip().getBytes(StandardCharsets.UTF_8);
                DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
                return exchange.getResponse().writeWith(Mono.just(buffer));
            }
            exchange.getResponse().setStatusCode(HttpStatus.FOUND);
            exchange.getResponse().getHeaders().setLocation(URI.create("/oauth2/authorization/keycloak"));
            return exchange.getResponse().setComplete();
        };
    }
}
