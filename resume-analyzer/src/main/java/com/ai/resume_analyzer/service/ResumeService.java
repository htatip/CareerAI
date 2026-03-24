package com.ai.resume_analyzer.service;

import com.ai.resume_analyzer.exception.ResourceNotFoundException;
import com.ai.resume_analyzer.exception.UnauthorizedException;
import com.ai.resume_analyzer.model.entity.Resume;
import com.ai.resume_analyzer.model.entity.ResumeSkill;
import com.ai.resume_analyzer.model.entity.User;
import com.ai.resume_analyzer.model.response.ResumeResponse;
import com.ai.resume_analyzer.repository.ResumeRepository;
import com.ai.resume_analyzer.repository.ResumeSkillRepository;
import com.ai.resume_analyzer.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final ResumeSkillRepository resumeSkillRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CloudinaryService cloudinaryService;

    @Value("${app.ai-service.base-url}")
    private String aiServiceBaseUrl;

    @Value("${app.ai-service.secret}")
    private String aiServiceSecret;

    private Resume findOwnedResume(Long resumeId, String email) {
        return resumeRepository.findByIdAndUserEmail(resumeId, email)
                .orElseThrow(() -> new UnauthorizedException(
                        "Resume not found or you do not have access to it."));
    }

    public ResumeResponse uploadResume(MultipartFile file, String email) throws IOException {

        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();
        if (originalName == null || !originalName.toLowerCase().endsWith(".pdf")
                || !"application/pdf".equals(contentType)) {
            throw new IllegalArgumentException("Only PDF files are accepted.");
        }

        if (file.getSize() > 5L * 1024 * 1024) {
            throw new IllegalArgumentException("File is too large. Maximum size is 5 MB.");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + email));

        String cloudinaryUrl = cloudinaryService.uploadPdf(file);
        log.info("Resume uploaded to Cloudinary: {}", cloudinaryUrl);

        Resume resume = new Resume();
        resume.setFileName(originalName);
        resume.setFilePath(cloudinaryUrl);
        resume.setUser(user);
        resumeRepository.save(resume);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("X-Service-Secret", aiServiceSecret);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return originalName;
            }
        };
        body.add("file", fileResource);

        ResponseEntity<String> response = null;
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                response = restTemplate.postForEntity(
                        aiServiceBaseUrl + "/analyze-resume",
                        new HttpEntity<>(body, headers), String.class);
                break;
            } catch (Exception e) {
                if (i < maxRetries - 1) {
                    log.warn("AI service error, retrying in 5 seconds... attempt {}", i + 1);
                    try {
                        Thread.sleep(5000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                } else {
                    throw e;
                }
            }
        }

        JsonNode root = objectMapper.readTree(response.getBody());

        JsonNode textNode = root.get("text");
        if (textNode != null) {
            resume.setParsedText(textNode.asText());
            resumeRepository.save(resume);
        }

        List<String> skillNames = new ArrayList<>();
        JsonNode skillsNode = root.get("skills");
        if (skillsNode != null && skillsNode.isArray()) {
            List<ResumeSkill> skillEntities = new ArrayList<>();
            for (JsonNode skillNode : skillsNode) {
                String skillName = skillNode.asText();
                skillNames.add(skillName);
                ResumeSkill resumeSkill = new ResumeSkill();
                resumeSkill.setResume(resume);
                resumeSkill.setSkill(skillName);
                skillEntities.add(resumeSkill);
            }
            resumeSkillRepository.saveAll(skillEntities);
            log.info("Saved {} skills for resume id: {}", skillEntities.size(), resume.getId());
        }

        return ResumeResponse.builder()
                .id(resume.getId())
                .fileName(resume.getFileName())
                .skills(skillNames)
                .uploadedAt(resume.getUploadedAt())
                .build();
    }

    public Page<ResumeResponse> getMyResumes(String email, Pageable pageable) {
        return resumeRepository.findByUserEmailOrderByUploadedAtDesc(email, pageable)
                .map(r -> ResumeResponse.builder()
                        .id(r.getId())
                        .fileName(r.getFileName())
                        .uploadedAt(r.getUploadedAt())
                        .skills(List.of())
                        .build());
    }

    @Transactional
    public void deleteResume(Long resumeId, String email) {
        Resume resume = findOwnedResume(resumeId, email);
        try {
            String publicId = cloudinaryService.extractPublicId(resume.getFilePath());
            cloudinaryService.deletePdf(publicId);
            log.info("Resume deleted from Cloudinary: {}", publicId);
        } catch (IOException e) {
            log.warn("Could not delete file from Cloudinary: {}", resume.getFilePath());
        }

        resumeSkillRepository.deleteByResumeId(resumeId);
        resumeRepository.delete(resume);
        log.info("Resume {} deleted by user: {}", resumeId, email);
    }

    public Resource downloadResume(Long resumeId, String email) {
        Resume resume = findOwnedResume(resumeId, email);
        byte[] fileBytes = restTemplate.getForObject(resume.getFilePath(), byte[].class);
        if (fileBytes == null) {
            throw new ResourceNotFoundException("Resume file not found on Cloudinary.");
        }
        return new ByteArrayResource(fileBytes);
    }

    public List<String> getSkills(Long resumeId, String email) {
        findOwnedResume(resumeId, email);
        return resumeSkillRepository.findByResumeId(resumeId)
                .stream().map(ResumeSkill::getSkill).toList();
    }

    public String analyzeResume(Long resumeId, String email) {
        Resume resume = findOwnedResume(resumeId, email);
        if (resume.getParsedText() == null || resume.getParsedText().isBlank()) {
            throw new IllegalStateException("Resume has no parsed text. Please re-upload.");
        }
        Map<String, Object> request = Map.of("resume_text", resume.getParsedText());
        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServiceBaseUrl + "/ai-resume-analysis",
                new HttpEntity<>(request, buildAiHeaders()), String.class);
        return response.getBody();
    }

    public String improveResume(Long resumeId, String email) {
        Resume resume = findOwnedResume(resumeId, email);
        if (resume.getParsedText() == null || resume.getParsedText().isBlank()) {
            throw new IllegalStateException("Resume has no parsed text. Please re-upload.");
        }
        Map<String, Object> request = Map.of("resume_text", resume.getParsedText());
        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServiceBaseUrl + "/improve-resume",
                new HttpEntity<>(request, buildAiHeaders()), String.class);
        return response.getBody();
    }

    private HttpHeaders buildAiHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Service-Secret", aiServiceSecret);
        return headers;
    }
}