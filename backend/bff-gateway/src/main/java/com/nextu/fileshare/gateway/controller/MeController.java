package com.nextu.fileshare.gateway.controller;

import com.nextu.fileshare.gateway.exception.ApiException;
import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.security.AuthUtils;
import com.nextu.fileshare.gateway.service.KeycloakAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * REST controller exposing the authenticated caller's profile.
 */
@RestController
@RequestMapping("/api")
public class MeController {

    private final KeycloakAdminService keycloakAdminService;

    public MeController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    /** Returns the current user's profile enriched with Keycloak creation metadata. */
    @GetMapping("/me")
    public Mono<AppUserDto> me(@AuthenticationPrincipal OidcUser oidcUser) {
        if (oidcUser == null) {
            return Mono.error(new ApiException("UNAUTHORIZED", "Utilisateur non authentifié.", HttpStatus.UNAUTHORIZED.value()));
        }
        return Mono.fromCallable(() -> {
            AppUserDto base = AuthUtils.toAppUser(oidcUser);
            String createdAt = keycloakAdminService.getUserCreatedAt(oidcUser.getSubject());
            return new AppUserDto(base.id(), base.username(), base.email(), base.roles(), createdAt);
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
