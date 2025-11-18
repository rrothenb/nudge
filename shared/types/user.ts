/**
 * User profile and preferences
 */

export type ViewType = "wiki" | "news" | "chat";

export interface UserProfile {
  // Identity (from Cognito)
  userId: string;              // Cognito sub (UUID)
  email: string;
  displayName: string;
  bio?: string;

  // Preferences
  defaultTrustThreshold: number;      // 0.0 to 1.0, default 0.5
  showControversySignals: boolean;    // Show controversy indicators
  showAlternateViews: boolean;        // Show alternate viewpoints

  // View preferences
  defaultView: ViewType;              // Default landing view

  // Metadata
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  lastLoginAt?: string;        // ISO timestamp
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  defaultTrustThreshold?: number;
  defaultView?: ViewType;
}

export interface UserPreferences {
  defaultTrustThreshold: number;
  defaultView: ViewType;
}
