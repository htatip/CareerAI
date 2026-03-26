package com.ai.resume_analyzer.controller;

import com.ai.resume_analyzer.model.request.ForgotPasswordRequest;
import com.ai.resume_analyzer.model.request.LoginRequest;
import com.ai.resume_analyzer.model.request.RegisterRequest;
import com.ai.resume_analyzer.model.request.ResetPasswordRequest;
import com.ai.resume_analyzer.model.response.ApiResponse;
import com.ai.resume_analyzer.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequest request) {

        authService.register(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("User registered successfully", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<String>> login(
            @Valid @RequestBody LoginRequest request) {

        String token = authService.login(request);

        return ResponseEntity.ok(ApiResponse.ok("Login successful", token));
    }

    /**
     * Step 1 — User submits their email.
     * Always responds with 200 OK to prevent user enumeration.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        authService.forgotPassword(request);

        return ResponseEntity.ok(ApiResponse.ok(
                "Password reset link has been sent to your email.", null));
    }

    /**
     * Step 2 — User submits the token from their email + their new password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);

        return ResponseEntity.ok(ApiResponse.ok("Password reset successfully. Please log in.", null));
    }
}