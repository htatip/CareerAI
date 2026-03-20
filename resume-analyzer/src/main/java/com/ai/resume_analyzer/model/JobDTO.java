package com.ai.resume_analyzer.model;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JobDTO {

    private String jobTitle;
    private String company;
    private String location;
    private String description;
    private String applyLink;
}