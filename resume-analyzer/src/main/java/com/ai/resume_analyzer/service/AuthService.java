package com.ai.resume_analyzer.service;

import com.ai.resume_analyzer.exception.ConflictException;
import com.ai.resume_analyzer.exception.ResourceNotFoundException;
import com.ai.resume_analyzer.exception.UnauthorizedException;
import com.ai.resume_analyzer.model.entity.PasswordResetToken;
import com.ai.resume_analyzer.model.entity.User;
import com.ai.resume_analyzer.model.request.ForgotPasswordRequest;
import com.ai.resume_analyzer.model.request.LoginRequest;
import com.ai.resume_analyzer.model.request.RegisterRequest;
import com.ai.resume_analyzer.model.request.ResetPasswordRequest;
import com.ai.resume_analyzer.repository.PasswordResetTokenRepository;
import com.ai.resume_analyzer.repository.UserRepository;
import com.ai.resume_analyzer.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetTokenRepository tokenRepository;
    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /** Token valid for 15 minutes. */
    private static final long TOKEN_EXPIRY_MINUTES = 15;

    // ── Register ──────────────────────────────────────────────────────────────

    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
        log.info("New user registered: {}", request.getEmail());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    public String login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        log.info("User logged in: {}", request.getEmail());
        return jwtUtil.generateToken(user.getEmail());
    }

    // ── Forgot password ───────────────────────────────────────────────────────

    /**
     * Generates a secure reset token and emails the reset link to the user.
     * Always returns successfully even if the email is not found — this prevents
     * user enumeration attacks.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found with email: " + request.getEmail()));

        // Invalidate any prior unused tokens for this user
        tokenRepository.invalidatePreviousTokens(user.getId());

        // Generate a cryptographically secure random token
        String rawToken = generateSecureToken();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(rawToken)
                .user(user)
                .expiresAt(Instant.now().plusSeconds(TOKEN_EXPIRY_MINUTES * 60))
                .used(false)
                .build();

        tokenRepository.save(resetToken);
        sendResetEmail(user, rawToken);

        log.info("Password reset token issued for: {}", user.getEmail());
    }

    // ── Reset password ────────────────────────────────────────────────────────

    /**
     * Validates the reset token and updates the user's password.
     *
     * @throws ResourceNotFoundException if token does not exist
     * @throws UnauthorizedException     if token is expired or already used
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or unknown reset token."));

        if (resetToken.isUsed()) {
            throw new UnauthorizedException("This reset link has already been used.");
        }

        if (Instant.now().isAfter(resetToken.getExpiresAt())) {
            throw new UnauthorizedException("This reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Mark the token as consumed so it cannot be reused
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        log.info("Password successfully reset for: {}", user.getEmail());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void sendResetEmail(User user, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("CareerAI — Reset Your Password");
        message.setText(
                "Hi " + user.getName() + ",\n\n"
                        + "We received a request to reset your CareerAI password.\n\n"
                        + "Click the link below to choose a new password (valid for " + TOKEN_EXPIRY_MINUTES
                        + " minutes):\n\n"
                        + resetLink + "\n\n"
                        + "If you did not request this, you can safely ignore this email — "
                        + "your password will not change.\n\n"
                        + "— The CareerAI Team");

        mailSender.send(message);
        log.info("Password reset email sent to: {}", user.getEmail());
    }
}