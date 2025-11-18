/**
 * User API endpoints
 */
import type { UserProfile } from '@nudge/shared';
import apiClient, { handleApiError } from './client';

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const response = await apiClient.get<UserProfile>('/user/profile');
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const response = await apiClient.put<UserProfile>('/user/profile', updates);
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}
