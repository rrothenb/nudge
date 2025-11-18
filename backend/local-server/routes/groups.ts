/**
 * Group management routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import type { Group, CreateGroupInput, UpdateGroupInput, AddGroupMemberInput } from '@nudge/shared';

export const groupRoutes = Router();

// GET /api/groups - List all groups (public + user's private)
groupRoutes.get('/', (req, res) => {
  const userId = (req as any).userId;
  const allGroups = store.getAllGroups();

  // Filter to show public groups + user's private groups
  const visibleGroups = allGroups.filter(
    (g) => g.visibility === 'public' || g.createdBy === userId
  );

  res.json(visibleGroups);
});

// GET /api/groups/:groupId - Get specific group
groupRoutes.get('/:groupId', (req, res) => {
  const userId = (req as any).userId;
  const { groupId } = req.params;

  const group = store.getGroup(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Check visibility
  if (group.visibility === 'private' && group.createdBy !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(group);
});

// POST /api/groups - Create new group
groupRoutes.post('/', (req, res) => {
  const userId = (req as any).userId;
  const input: CreateGroupInput = req.body;

  if (!input.name || input.name.trim().length === 0) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const newGroup: Group = {
    groupId,
    name: input.name.trim(),
    description: input.description,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: input.initialMembers?.map((m) => ({
      ...m,
      addedBy: userId,
      addedAt: new Date().toISOString(),
    })) || [],
    isSystemDefined: false,
    visibility: input.visibility || 'public',
    tags: input.tags,
  };

  store.addGroup(newGroup);
  res.status(201).json(newGroup);
});

// PUT /api/groups/:groupId - Update group
groupRoutes.put('/:groupId', (req, res) => {
  const userId = (req as any).userId;
  const { groupId } = req.params;
  const input: UpdateGroupInput = req.body;

  const group = store.getGroup(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Only creator can update (or system for system groups)
  if (group.createdBy !== userId && !group.isSystemDefined) {
    return res.status(403).json({ error: 'Only the creator can update this group' });
  }

  const updatedGroup: Group = {
    ...group,
    name: input.name !== undefined ? input.name : group.name,
    description: input.description !== undefined ? input.description : group.description,
    visibility: input.visibility !== undefined ? input.visibility : group.visibility,
    tags: input.tags !== undefined ? input.tags : group.tags,
    updatedAt: new Date().toISOString(),
  };

  store.addGroup(updatedGroup);
  res.json(updatedGroup);
});

// DELETE /api/groups/:groupId - Delete group
groupRoutes.delete('/:groupId', (req, res) => {
  const userId = (req as any).userId;
  const { groupId } = req.params;

  const group = store.getGroup(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Only creator can delete (system groups cannot be deleted)
  if (group.isSystemDefined) {
    return res.status(403).json({ error: 'System groups cannot be deleted' });
  }

  if (group.createdBy !== userId) {
    return res.status(403).json({ error: 'Only the creator can delete this group' });
  }

  store.deleteGroup(groupId);
  res.status(204).send();
});

// POST /api/groups/:groupId/members - Add member to group
groupRoutes.post('/:groupId/members', (req, res) => {
  const userId = (req as any).userId;
  const { groupId } = req.params;
  const input: AddGroupMemberInput = req.body;

  const group = store.getGroup(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Only creator can add members
  if (group.createdBy !== userId && !group.isSystemDefined) {
    return res.status(403).json({ error: 'Only the creator can add members' });
  }

  if (!input.memberId || !input.memberType) {
    return res.status(400).json({ error: 'memberId and memberType are required' });
  }

  // Check if already a member
  const existing = group.members.find((m) => m.memberId === input.memberId);
  if (existing) {
    return res.status(400).json({ error: 'Member already exists in group' });
  }

  const updatedGroup: Group = {
    ...group,
    members: [
      ...group.members,
      {
        memberId: input.memberId,
        memberType: input.memberType,
        addedBy: userId,
        addedAt: new Date().toISOString(),
        notes: input.notes,
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  store.addGroup(updatedGroup);
  res.json(updatedGroup);
});

// DELETE /api/groups/:groupId/members/:memberId - Remove member from group
groupRoutes.delete('/:groupId/members/:memberId', (req, res) => {
  const userId = (req as any).userId;
  const { groupId, memberId } = req.params;

  const group = store.getGroup(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  // Only creator can remove members
  if (group.createdBy !== userId && !group.isSystemDefined) {
    return res.status(403).json({ error: 'Only the creator can remove members' });
  }

  const updatedGroup: Group = {
    ...group,
    members: group.members.filter((m) => m.memberId !== memberId),
    updatedAt: new Date().toISOString(),
  };

  store.addGroup(updatedGroup);
  res.json(updatedGroup);
});
