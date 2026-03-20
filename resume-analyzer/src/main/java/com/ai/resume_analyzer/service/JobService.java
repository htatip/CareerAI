package com.ai.resume_analyzer.service;

import com.ai.resume_analyzer.exception.UnauthorizedException;
import com.ai.resume_analyzer.model.JobDTO;
import com.ai.resume_analyzer.model.entity.ResumeSkill;
import com.ai.resume_analyzer.repository.ResumeRepository;
import com.ai.resume_analyzer.repository.ResumeSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final RestTemplate restTemplate;
    private final ResumeRepository resumeRepository;
    private final ResumeSkillRepository resumeSkillRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.ai-service.base-url}")
    private String aiServiceBaseUrl;

    @Value("${app.ai-service.secret}")
    private String aiServiceSecret;

    @Value("${rapidapi.key}")
    private String apiKey;

    @Value("${rapidapi.host}")
    private String apiHost;

    /**
     * Verifies that the given resume belongs to the given user.
     * Throws UnauthorizedException if the resume is not found or not owned by the
     * user.
     */
    private void verifyOwnership(Long resumeId, String email) {
        resumeRepository.findByIdAndUserEmail(resumeId, email)
                .orElseThrow(() -> new UnauthorizedException(
                        "Resume not found or you do not have access to it."));
    }

    /**
     * Searches live jobs via the JSearch RapidAPI using the given skill and
     * location.
     * Supports pagination via the page parameter (0-indexed).
     */
    public List<JobDTO> searchJobs(Long resumeId, String email,
            String skill, String location,
            int page) {
        verifyOwnership(resumeId, email);

        String encodedQuery = URLEncoder.encode(skill + " in " + location, StandardCharsets.UTF_8);
        String apiUrl = "https://jsearch.p.rapidapi.com/search?query="
                + encodedQuery + "&num_pages=1&page=" + (page + 1);

        ResponseEntity<Map> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, new HttpEntity<>(buildRapidApiHeaders()), Map.class);

        List<Map<String, Object>> jobs = extractJobs(response);
        List<JobDTO> results = new ArrayList<>();

        for (Map<String, Object> job : jobs) {
            results.add(new JobDTO(
                    getString(job, "job_title"),
                    getString(job, "employer_name"),
                    job.get("job_city") != null ? job.get("job_city").toString() : "Remote",
                    getString(job, "job_description"),
                    getString(job, "job_apply_link")));
        }

        log.info("Returned {} jobs for resumeId: {} skill: {}", results.size(), resumeId, skill);
        return results;
    }

    /**
     * Sends a job description to the AI service to compute a match score against
     * the user's resume skills.
     */
    public String analyzeJob(Long resumeId, String email, Map<String, String> request) {
        verifyOwnership(resumeId, email);

        List<String> skills = resumeSkillRepository.findByResumeId(resumeId)
                .stream().map(ResumeSkill::getSkill).toList();

        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("resume_skills", skills);
        aiRequest.put("job_description", request.get("jobDescription"));

        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServiceBaseUrl + "/ai-resume-job-analysis",
                new HttpEntity<>(aiRequest, buildAiHeaders()), String.class);

        log.info("Job analysis done for resumeId: {}", resumeId);
        return response.getBody();
    }

    /**
     * Fetches live jobs from RapidAPI, sends them to the AI ranker, then merges
     * the AI-generated match scores back with the original RapidAPI data so that
     * apply links are preserved in the final response.
     */
    public String recommendJobsAI(Long resumeId, String email, String location) {
        verifyOwnership(resumeId, email);

        List<String> skillList = resumeSkillRepository.findByResumeId(resumeId)
                .stream().map(ResumeSkill::getSkill).toList();

        if (skillList.isEmpty()) {
            throw new IllegalStateException("No skills found for resume id: " + resumeId);
        }

        // Step 1: Fetch live jobs from RapidAPI using the top two skills
        String query = skillList.stream().limit(2).collect(Collectors.joining(" "));
        String encodedQuery = URLEncoder.encode(query + " developer in " + location, StandardCharsets.UTF_8);
        String apiUrl = "https://jsearch.p.rapidapi.com/search?query=" + encodedQuery + "&num_pages=1";

        ResponseEntity<Map> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, new HttpEntity<>(buildRapidApiHeaders()), Map.class);

        List<Map<String, Object>> jobsData = extractJobs(response);

        // Step 2: Send simplified job title list to the AI ranker
        List<String> jobTitles = new ArrayList<>();
        for (Map<String, Object> job : jobsData) {
            jobTitles.add(getString(job, "job_title") + " at " + getString(job, "employer_name"));
        }

        log.info("Sending {} jobs to AI ranker for resumeId: {}", jobTitles.size(), resumeId);

        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("resume_skills", skillList);
        aiRequest.put("jobs", jobTitles);

        ResponseEntity<String> aiResponse = restTemplate.postForEntity(
                aiServiceBaseUrl + "/rank-jobs",
                new HttpEntity<>(aiRequest, buildAiHeaders()), String.class);

        // Step 3: Merge AI scores back with full RapidAPI data to preserve apply links
        try {
            JsonNode aiJobs = objectMapper.readTree(aiResponse.getBody());

            List<Map<String, Object>> merged = new ArrayList<>();
            for (int i = 0; i < jobsData.size(); i++) {
                Map<String, Object> job = jobsData.get(i);
                Map<String, Object> result = new java.util.LinkedHashMap<>();
                result.put("jobTitle", getString(job, "job_title"));
                result.put("company", getString(job, "employer_name"));
                result.put("location", job.get("job_city") != null ? job.get("job_city").toString() : "Remote");
                result.put("applyLink", getString(job, "job_apply_link"));

                if (aiJobs != null && aiJobs.isArray() && i < aiJobs.size()) {
                    JsonNode aiJob = aiJobs.get(i);
                    result.put("match_score", aiJob.has("match_score") ? aiJob.get("match_score").asDouble() : 0);
                    result.put("reason", aiJob.has("reason") ? aiJob.get("reason").asText() : "");
                }

                merged.add(result);
            }

            return objectMapper.writeValueAsString(merged);
        } catch (Exception e) {
            log.warn("Failed to merge AI scores, returning raw AI response: {}", e.getMessage());
            return aiResponse.getBody();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private HttpHeaders buildRapidApiHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", apiKey);
        headers.set("X-RapidAPI-Host", apiHost);
        return headers;
    }

    private HttpHeaders buildAiHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Service-Secret", aiServiceSecret);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractJobs(ResponseEntity<Map> response) {
        if (response.getBody() == null || response.getBody().get("data") == null) {
            return Collections.emptyList();
        }
        return (List<Map<String, Object>>) response.getBody().get("data");
    }

    private String getString(Map<String, Object> map, String key) {
        return map.get(key) != null ? map.get(key).toString() : "";
    }
}