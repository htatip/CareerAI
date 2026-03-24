// Create KeepAliveService.java in service/ folder
package com.ai.resume_analyzer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Slf4j
public class KeepAliveService {

    private final RestTemplate restTemplate;

    @Value("${app.ai-service.base-url}")
    private String aiServiceBaseUrl;

    // Ping every 10 minutes to prevent sleep
    @Scheduled(fixedRate = 600000)
    public void keepAlive() {
        try {
            restTemplate.getForObject(aiServiceBaseUrl + "/ping", String.class);
            log.info("AI service keep-alive ping successful");
        } catch (Exception e) {
            log.warn("AI service keep-alive ping failed: {}", e.getMessage());
        }
    }
}