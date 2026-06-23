package com.nextu.fileshare.gateway.controller;

import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.model.CreateUserRequest;
import com.nextu.fileshare.gateway.model.CreateUserResponse;
import com.nextu.fileshare.gateway.security.AuthUtils;
import com.nextu.fileshare.gateway.service.KeycloakAdminService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final KeycloakAdminService keycloakAdminService;

    public AdminUserController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    @GetMapping
    public Mono<List<AppUserDto>> listAllUsersAdmin() {
        return Mono.fromCallable(keycloakAdminService::listUsers)
            .subscribeOn(Schedulers.boundedElastic());
    }

    @PostMapping
    public Mono<CreateUserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return Mono.fromCallable(() -> keycloakAdminService.createUser(request))
            .subscribeOn(Schedulers.boundedElastic());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteUser(@PathVariable String id, Authentication authentication) {
        AppUserDto currentUser = AuthUtils.toAppUser(authentication);
        return Mono.fromRunnable(() -> keycloakAdminService.deleteUser(id, currentUser.id()))
            .subscribeOn(Schedulers.boundedElastic())
            .then();
    }
}
