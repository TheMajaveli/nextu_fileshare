package com.nextu.fileshare.gateway.controller;

import com.nextu.fileshare.gateway.model.UserSummaryDto;
import com.nextu.fileshare.gateway.service.KeycloakAdminService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * REST controller exposing the user directory for the share-picker modal.
 */
@RestController
@RequestMapping("/api/users")
public class UserDirectoryController {

    private final KeycloakAdminService keycloakAdminService;

    public UserDirectoryController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    /**
     * Returns all realm users except the caller, for populating the share target picker.
     */
    @GetMapping
    public Mono<List<UserSummaryDto>> listUsers(@AuthenticationPrincipal OidcUser oidcUser) {
        return Mono.fromCallable(() -> keycloakAdminService.listUsersExcluding(oidcUser.getSubject()))
            .subscribeOn(Schedulers.boundedElastic());
    }
}
