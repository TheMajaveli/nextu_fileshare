package com.nextu.fileshare.gateway.controller;

import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.security.AuthUtils;
import com.nextu.fileshare.gateway.service.KeycloakAdminService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/users")
public class UserDirectoryController {

    private final KeycloakAdminService keycloakAdminService;

    public UserDirectoryController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    @GetMapping
    public Mono<List<AppUserDto>> listUsers(Authentication authentication) {
        AppUserDto currentUser = AuthUtils.toAppUser(authentication);
        return Mono.fromCallable(() -> keycloakAdminService.listUsers().stream()
                .filter(user -> !user.id().equals(currentUser.id()))
                .toList())
            .subscribeOn(Schedulers.boundedElastic());
    }
}
