package com.ai.resume_analyzer.controller;

import com.ai.resume_analyzer.model.response.ApiResponse;
import com.ai.resume_analyzer.model.response.ResumeResponse;
import com.ai.resume_analyzer.security.SecurityUtils;
import com.ai.resume_analyzer.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/resume")
@RequiredArgsConstructor
public class ResumeController {

        private final ResumeService resumeService;

        @PostMapping("/upload")
        public ResponseEntity<ApiResponse<ResumeResponse>> uploadResume(
                        @RequestParam("file") MultipartFile file) throws IOException {

                String email = getEmail();
                ResumeResponse result = resumeService.uploadResume(file, email);
                return ResponseEntity.ok(ApiResponse.ok("Resume uploaded successfully", result));
        }

        @GetMapping("/my-resumes")
        public ResponseEntity<ApiResponse<Page<ResumeResponse>>> getMyResumes(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {

                String email = getEmail();
                int safeSize = Math.min(size, 50);
                Pageable pageable = PageRequest.of(page, safeSize);
                Page<ResumeResponse> resumes = resumeService.getMyResumes(email, pageable);
                return ResponseEntity.ok(ApiResponse.ok("Resumes fetched", resumes));
        }

        @GetMapping("/skills/{resumeId}")
        public ResponseEntity<ApiResponse<List<String>>> getSkills(
                        @PathVariable Long resumeId) {

                String email = getEmail();
                List<String> skills = resumeService.getSkills(resumeId, email);
                return ResponseEntity.ok(ApiResponse.ok("Skills fetched successfully", skills));
        }

        @PostMapping("/analyze/{resumeId}")
        public ResponseEntity<ApiResponse<String>> analyzeResume(
                        @PathVariable Long resumeId) {

                String email = getEmail();
                String result = resumeService.analyzeResume(resumeId, email);
                return ResponseEntity.ok(ApiResponse.ok("Analysis complete", result));
        }

        @PostMapping("/improve/{resumeId}")
        public ResponseEntity<ApiResponse<String>> improveResume(
                        @PathVariable Long resumeId) {

                String email = getEmail();
                String result = resumeService.improveResume(resumeId, email);
                return ResponseEntity.ok(ApiResponse.ok("Improvement suggestions ready", result));
        }

        @DeleteMapping("/{resumeId}")
        public ResponseEntity<ApiResponse<Void>> deleteResume(
                        @PathVariable Long resumeId) {

                String email = getEmail();
                resumeService.deleteResume(resumeId, email);
                return ResponseEntity.ok(ApiResponse.ok("Resume deleted successfully", null));
        }

        @GetMapping("/{resumeId}/download")
        public ResponseEntity<Resource> downloadResume(
                        @PathVariable Long resumeId) {

                String email = getEmail();
                Resource file = resumeService.downloadResume(resumeId, email);

                return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_PDF)
                                .header(HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=\"" + file.getFilename() + "\"")
                                .body(file);
        }

        private String getEmail() {
                return SecurityUtils.getCurrentUserEmail();
        }
}