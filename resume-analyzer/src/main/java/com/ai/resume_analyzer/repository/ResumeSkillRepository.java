package com.ai.resume_analyzer.repository;

import com.ai.resume_analyzer.model.entity.ResumeSkill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResumeSkillRepository extends JpaRepository<ResumeSkill, Long> {

    List<ResumeSkill> findByResumeId(Long resumeId);

    void deleteByResumeId(Long resumeId);
}