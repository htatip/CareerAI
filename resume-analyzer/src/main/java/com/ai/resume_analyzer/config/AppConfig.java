package com.ai.resume_analyzer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class AppConfig {

    /**
     * RestTemplate with explicit timeouts.
     * - connectTimeout: 5s — fail fast if the AI service is unreachable.
     * - readTimeout: 60s — LLM inference can take up to ~30s; 60s provides
     * headroom without blocking threads indefinitely.
     * Previously no timeouts were set, which could hang Spring threads forever
     * if the Python AI service was slow or unresponsive.
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(60_000);
        return new RestTemplate(factory);
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}