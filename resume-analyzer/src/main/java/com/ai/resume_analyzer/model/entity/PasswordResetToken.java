package com.ai.resume_analyzer.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Secure random token sent in the reset link. */
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    /** The user this reset belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Token expires 15 minutes after creation. */
    @Column(nullable = false)
    private Instant expiresAt;

    /** Marked true once the token has been used. */
    @Column(nullable = false)
    private boolean used = false;
}