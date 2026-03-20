package com.ai.resume_analyzer.service;

import com.ai.resume_analyzer.exception.ConflictException;
import com.ai.resume_analyzer.exception.UnauthorizedException;
import com.ai.resume_analyzer.model.entity.User;
import com.ai.resume_analyzer.model.request.LoginRequest;
import com.ai.resume_analyzer.model.request.RegisterRequest;
import com.ai.resume_analyzer.repository.UserRepository;
import com.ai.resume_analyzer.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

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

    public String login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        log.info("User logged in: {}", request.getEmail());
        return jwtUtil.generateToken(user.getEmail());
    }
}