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
import org.springframework.web.client.HttpClientErrorException;
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

    // ── RapidAPI (primary) ────────────────────────────────────────────────────
    @Value("${rapidapi.key}")
    private String rapidApiKey;

    @Value("${rapidapi.host}")
    private String rapidApiHost;

    // ── OpenWebNinja (fallback) ───────────────────────────────────────────────
    @Value("${openwebninja.key}")
    private String openWebNinjaKey;

    @Value("${openwebninja.host}")
    private String openWebNinjaHost;

    // ── Provider-specific JSearch endpoints ──────────────────────────────────
    // RapidAPI and OpenWebNinja expose JSearch at different base URLs.
    private static final String RAPIDAPI_URL = "https://jsearch.p.rapidapi.com/search";
    private static final String OPENWEBNINJA_URL = "https://api.openwebninja.com/jsearch/search";

    /**
     * Verifies that the given resume belongs to the given user.
     */
    private void verifyOwnership(Long resumeId, String email) {
        resumeRepository.findByIdAndUserEmail(resumeId, email)
                .orElseThrow(() -> new UnauthorizedException(
                        "Resume not found or you do not have access to it."));
    }

    /**
     * Searches live jobs. Tries RapidAPI first; falls back to OpenWebNinja on
     * quota errors (HTTP 429 / 403).
     */
    public List<JobDTO> searchJobs(Long resumeId, String email,
            String skill, String location, int page) {
        verifyOwnership(resumeId, email);

        String queryString = "?query="
                + URLEncoder.encode(skill + " in " + location, StandardCharsets.UTF_8)
                + "&num_pages=1&page=" + (page + 1);

        ResponseEntity<Map> response = executeWithFallback(queryString);

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
     * Sends a job description to the AI service to compute a match score.
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
     * Fetches live jobs, ranks them via AI, and merges apply links back.
     * Uses RapidAPI with automatic OpenWebNinja fallback on quota exhaustion.
     */
    public String recommendJobsAI(Long resumeId, String email, String location) {
        verifyOwnership(resumeId, email);

        List<String> skillList = resumeSkillRepository.findByResumeId(resumeId)
                .stream().map(ResumeSkill::getSkill).toList();

        if (skillList.isEmpty()) {
            throw new IllegalStateException("No skills found for resume id: " + resumeId);
        }

        // String query = skillList.stream().limit(2).collect(Collectors.joining(" "));
        String query = skillList.get(new Random().nextInt(skillList.size()));
        String queryString = "?query="
                + URLEncoder.encode(query + " developer in " + location, StandardCharsets.UTF_8)
                + "&num_pages=1";

        ResponseEntity<Map> response = executeWithFallback(queryString);

        List<Map<String, Object>> jobsData = extractJobs(response);

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

    // ── Fallback core logic ───────────────────────────────────────────────────

    /**
     * Executes a JSearch GET request using the shared query string.
     * Builds the full URL per provider so each hits its own correct endpoint:
     * Primary → https://jsearch.p.rapidapi.com/search?...
     * Fallback → https://api.openwebninja.com/jsearch?...
     *
     * On HTTP 429 (Too Many Requests) or 403 (Forbidden / quota exhausted)
     * from RapidAPI, automatically retries with OpenWebNinja.
     *
     * @param queryString the raw query string including leading '?', e.g.
     *                    "?query=java+in+NYC&num_pages=1"
     */
    private ResponseEntity<Map> executeWithFallback(String queryString) {
        String rapidApiFullUrl = RAPIDAPI_URL + queryString;
        try {
            log.debug("Trying RapidAPI: {}", rapidApiFullUrl);
            ResponseEntity<Map> response = restTemplate.exchange(
                    rapidApiFullUrl, HttpMethod.GET,
                    new HttpEntity<>(buildHeaders(rapidApiKey, rapidApiHost)),
                    Map.class);
            log.debug("RapidAPI succeeded");
            return response;

        } catch (HttpClientErrorException ex) {
            HttpStatusCode status = ex.getStatusCode();

            if (isQuotaError(status)) {
                log.warn("RapidAPI quota exhausted (HTTP {}). Switching to OpenWebNinja fallback.",
                        status.value());
                return callOpenWebNinja(queryString);
            }

            log.error("RapidAPI returned non-quota error: HTTP {}", status.value());
            throw ex;
        }
    }

    /**
     * Executes the request against OpenWebNinja using its own base URL.
     * Throws a clear RuntimeException if this also fails.
     *
     * @param queryString the raw query string, e.g.
     *                    "?query=java+in+NYC&num_pages=1"
     */
    private ResponseEntity<Map> callOpenWebNinja(String queryString) {
        String openWebNinjaFullUrl = OPENWEBNINJA_URL + queryString;
        System.out.println("Trying OpenWebNinja fallback: " + openWebNinjaFullUrl);
        try {
            log.info("Calling OpenWebNinja fallback: {}", openWebNinjaFullUrl);
            ResponseEntity<Map> response = restTemplate.exchange(
                    openWebNinjaFullUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(buildHeadersopenweb(openWebNinjaKey)),
                    Map.class);

            log.info("OpenWebNinja fallback succeeded");
            return response;
        } catch (HttpClientErrorException ex) {
            log.error("OpenWebNinja fallback also failed: HTTP {}", ex.getStatusCode().value());
            throw new RuntimeException(
                    "Both RapidAPI and OpenWebNinja are unavailable. Please try again later.", ex);
        }
    }

    /**
     * Returns true for HTTP status codes that indicate quota exhaustion.
     * RapidAPI uses 429 (standard) and occasionally 403 with a quota message.
     */
    private boolean isQuotaError(HttpStatusCode status) {
        int code = status.value();
        return code == 429 || code == 403;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private HttpHeaders buildHeaders(String key, String host) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", key);
        headers.set("X-RapidAPI-Host", host);
        return headers;
    }

    private HttpHeaders buildHeadersopenweb(String key) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", key);
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