/**
 * Group API client methods
 */
import { apiClient } from './client';
import type { Group, CreateGroupInput, UpdateGroupInput, AddGroupMemberInput } from '@nudge/shared';

/**
 * Get all groups (public + user's private groups)
 */
export async function getGroups(): Promise<Group[]> {
  const response = await apiClient.get<Group[]>('/api/groups');
  return response.data;
}

/**
 * Get a specific group by ID
 */
export async function getGroup(groupId: string): Promise<Group> {
  const response = await apiClient.get<Group>(`/api/groups/${groupId}`);
  return response.data;
}

/**
 * Create a new group
 */
export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const response = await apiClient.post<Group>('/api/groups', input);
  return response.data;
}

/**
 * Update a group
 */
export async function updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
  const response = await apiClient.put<Group>(`/api/groups/${groupId}`, input);
  return response.data;
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}`);
}

/**
 * Add a member to a group
 */
export async function addGroupMember(
  groupId: string,
  input: AddGroupMemberInput
): Promise<Group> {
  const response = await apiClient.post<Group>(`/api/groups/${groupId}/members`, input);
  return response.data;
}

/**
 * Remove a member from a group
 */
export async function removeGroupMember(
  groupId: string,
  memberId: string
): Promise<Group> {
  const response = await apiClient.delete<Group>(
    `/api/groups/${groupId}/members/${memberId}`
  );
  return response.data;
}
