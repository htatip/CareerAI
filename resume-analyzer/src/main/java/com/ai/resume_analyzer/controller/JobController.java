package com.ai.resume_analyzer.controller;

import com.ai.resume_analyzer.model.JobDTO;
import com.ai.resume_analyzer.security.SecurityUtils;
import com.ai.resume_analyzer.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for job-related operations.
 * All business logic and ownership enforcement is delegated to JobService.
 */
@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

        private final JobService jobService;

        @GetMapping("/search/{resumeId}")
        public ResponseEntity<List<JobDTO>> searchJobs(
                        @PathVariable Long resumeId,
                        @RequestParam String skill,
                        @RequestParam String location,
                        @RequestParam(defaultValue = "0") int page) {

                List<JobDTO> results = jobService.searchJobs(
                                resumeId, SecurityUtils.getCurrentUserEmail(), skill, location, page);
                return ResponseEntity.ok(results);
        }

        @PostMapping("/analyze-job/{resumeId}")
        public ResponseEntity<String> analyzeJob(
                        @PathVariable Long resumeId,
                        @RequestBody Map<String, String> request) {

                return ResponseEntity.ok(
                                jobService.analyzeJob(resumeId, SecurityUtils.getCurrentUserEmail(), request));
        }

        @PostMapping("/recommend-ai/{resumeId}")
        public ResponseEntity<String> recommendJobsAI(
                        @PathVariable Long resumeId,
                        @RequestParam(defaultValue = "Remote") String location) {

                return ResponseEntity.ok(
                                jobService.recommendJobsAI(resumeId, SecurityUtils.getCurrentUserEmail(), location));
        }
}