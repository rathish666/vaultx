package com.vaultx.backend;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class PingController {

    @GetMapping("/api/v1/ping")
    public Map<String, String> ping() {
        return Map.of("status", "ok");
    }
}