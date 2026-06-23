package com.nextu.fileshare.gateway.controller;

import com.nextu.fileshare.gateway.exception.ApiException;
import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.security.AuthUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
public class MeController {

    @GetMapping("/me")
    public Mono<AppUserDto> me(@AuthenticationPrincipal OidcUser oidcUser) {
        if (oidcUser == null) {
            return Mono.error(new ApiException("UNAUTHORIZED", "Utilisateur non authentifié.", HttpStatus.UNAUTHORIZED.value()));
        }
        return Mono.just(AuthUtils.toAppUser(oidcUser));
    }
}
