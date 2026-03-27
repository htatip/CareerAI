package com.ai.resume_analyzer.repository;

import com.ai.resume_analyzer.model.entity.ResumeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ResumeSkillRepository extends JpaRepository<ResumeSkill, Long> {

    List<ResumeSkill> findByResumeId(Long resumeId);

    @Modifying
    @Transactional
    void deleteByResumeId(Long resumeId);
}