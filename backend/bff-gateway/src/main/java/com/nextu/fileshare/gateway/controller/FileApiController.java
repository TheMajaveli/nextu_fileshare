package com.nextu.fileshare.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.nextu.fileshare.gateway.exception.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Proxies file API requests to the storage service via WebClient with the relayed OAuth2 token.
 * Spring Cloud Gateway TokenRelay does not reliably handle multipart bodies or JSON POST bodies.
 */
@RestController
public class FileApiController {

    private final WebClient storageWebClient;

    public FileApiController(WebClient storageWebClient) {
        this.storageWebClient = storageWebClient;
    }

    /** Lists files owned by the authenticated user. */
    @GetMapping("/api/files")
    public Mono<ResponseEntity<JsonNode>> listMyFiles() {
        return proxyGet("/files");
    }

    /** Lists files shared with the authenticated user. */
    @GetMapping("/api/files/shared-with-me")
    public Mono<ResponseEntity<JsonNode>> listSharedWithMe() {
        return proxyGet("/files/shared");
    }

    /** Streams a file download when the requester has access. */
    @GetMapping("/api/files/{id}/download")
    public Mono<ResponseEntity<byte[]>> download(@PathVariable UUID id) {
        return storageWebClient.get()
            .uri("/files/{id}/download", id)
            .exchangeToMono(this::toBinaryResponse);
    }

    /** Forwards a multipart upload to the storage service with the relayed access token. */
    @PostMapping(value = "/api/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<JsonNode>> upload(@RequestPart("file") FilePart file) {
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("file", file);

        return storageWebClient.post()
            .uri("/files")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
            .exchangeToMono(this::toJsonResponse);
    }

    /** Shares a file with another user. */
    @PostMapping(value = "/api/files/{id}/share", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<JsonNode>> share(
        @PathVariable UUID id,
        @RequestBody JsonNode body
    ) {
        return storageWebClient.post()
            .uri("/files/{id}/share", id)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .exchangeToMono(this::toJsonResponse);
    }

    /** Deletes a file owned by the authenticated user. */
    @DeleteMapping("/api/files/{id}")
    public Mono<ResponseEntity<Void>> delete(@PathVariable UUID id) {
        return storageWebClient.delete()
            .uri("/files/{id}", id)
            .exchangeToMono(response -> {
                if (response.statusCode().is2xxSuccessful()) {
                    return Mono.just(ResponseEntity.status(response.statusCode()).build());
                }
                return response.bodyToMono(JsonNode.class)
                    .defaultIfEmpty(JsonNodeFactory.instance.objectNode())
                    .flatMap(body -> Mono.error(new ApiException(
                        body.path("error").asText("ERROR"),
                        body.path("message").asText("Erreur lors de la suppression du fichier."),
                        response.statusCode().value()
                    )));
            });
    }

    /** Revokes a user's access to a shared file. */
    @DeleteMapping("/api/files/{id}/share/{userId}")
    public Mono<ResponseEntity<JsonNode>> revokeShare(
        @PathVariable UUID id,
        @PathVariable UUID userId
    ) {
        return storageWebClient.delete()
            .uri("/files/{id}/share/{userId}", id, userId)
            .exchangeToMono(this::toJsonResponse);
    }

    private Mono<ResponseEntity<JsonNode>> proxyGet(String uri) {
        return storageWebClient.get()
            .uri(uri)
            .exchangeToMono(this::toJsonResponse);
    }

    private Mono<ResponseEntity<JsonNode>> toJsonResponse(ClientResponse response) {
        return response.bodyToMono(JsonNode.class)
            .defaultIfEmpty(JsonNodeFactory.instance.objectNode())
            .flatMap(body -> {
                if (response.statusCode().is2xxSuccessful()) {
                    return Mono.just(ResponseEntity.status(response.statusCode()).body(body));
                }
                String code = body.path("error").asText("ERROR");
                String message = body.path("message").asText("Erreur lors de l'appel au service de fichiers.");
                return Mono.error(new ApiException(code, message, response.statusCode().value()));
            });
    }

    private static final List<String> DOWNLOAD_HEADER_ALLOWLIST = List.of(
        HttpHeaders.CONTENT_TYPE,
        HttpHeaders.CONTENT_DISPOSITION,
        HttpHeaders.CONTENT_LENGTH,
        HttpHeaders.CACHE_CONTROL
    );

    private Mono<ResponseEntity<byte[]>> toBinaryResponse(ClientResponse response) {
        if (response.statusCode().is2xxSuccessful()) {
            HttpHeaders headers = new HttpHeaders();
            response.headers().asHttpHeaders().forEach((name, values) -> {
                if (DOWNLOAD_HEADER_ALLOWLIST.contains(name)) {
                    headers.put(name, values);
                }
            });
            return response.bodyToMono(byte[].class)
                .defaultIfEmpty(new byte[0])
                .map(body -> ResponseEntity.status(response.statusCode()).headers(headers).body(body));
        }
        return toJsonResponse(response).flatMap(entity ->
            Mono.error(new ApiException(
                entity.getBody().path("error").asText("ERROR"),
                entity.getBody().path("message").asText("Erreur lors du téléchargement du fichier."),
                response.statusCode().value()
            ))
        );
    }
}
