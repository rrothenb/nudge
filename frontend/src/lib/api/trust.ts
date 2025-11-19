/**
 * Trust API endpoints
 */
import type { TrustRelationship } from '@nudge/shared';
import apiClient, { handleApiError } from './client';

export interface SetTrustInput {
  targetId: string;
  targetType: 'user' | 'source' | 'assertion' | 'group';
  trustValue: number;
  notes?: string;
}

/**
 * Set trust value for a target
 */
export async function setTrust(input: SetTrustInput): Promise<TrustRelationship> {
  try {
    const response = await apiClient.post<TrustRelationship>('/trust', input);
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Get trust value for a specific target
 */
export async function getTrust(targetId: string): Promise<number> {
  try {
    const response = await apiClient.get<{ trustValue: number }>(`/trust/${targetId}`);
    return response.data.trustValue;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * List all trust relationships for current user
 */
export async function listTrust(): Promise<TrustRelationship[]> {
  try {
    const response = await apiClient.get<TrustRelationship[]>('/trust');
    return response.data;
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Remove trust relationship (reset to default)
 */
export async function removeTrust(targetId: string): Promise<void> {
  try {
    await apiClient.delete(`/trust/${targetId}`);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}
