package com.ai.resume_analyzer.repository;

import com.ai.resume_analyzer.model.entity.Resume;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

    Optional<Resume> findByIdAndUserEmail(Long id, String email);

    Page<Resume> findByUserEmailOrderByUploadedAtDesc(String email, Pageable pageable);
}