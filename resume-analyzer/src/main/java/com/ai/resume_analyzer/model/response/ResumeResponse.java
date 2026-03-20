package com.ai.resume_analyzer.model.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class ResumeResponse {
    private Long id;
    private String fileName;
    private List<String> skills;
    private Instant uploadedAt;
}