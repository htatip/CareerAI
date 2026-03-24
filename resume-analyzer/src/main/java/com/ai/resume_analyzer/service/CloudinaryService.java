package com.ai.resume_analyzer.service;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public String uploadPdf(MultipartFile file) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                Map.of(
                        "resource_type", "raw",
                        "folder", "resumes",
                        "format", "pdf",
                        "access_mode", "public"));
        return (String) result.get("secure_url");
    }

    public void deletePdf(String publicId) throws IOException {
        cloudinary.uploader().destroy(publicId,
                Map.of("resource_type", "raw"));
    }

    public String extractPublicId(String cloudinaryUrl) {
        String[] parts = cloudinaryUrl.split("/upload/");
        if (parts.length > 1) {
            String path = parts[1].replaceFirst("v\\d+/", "");
            return path.replace(".pdf", "");
        }
        return cloudinaryUrl;
    }
}