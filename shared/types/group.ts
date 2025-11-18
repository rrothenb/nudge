/**
 * Group types - representing collections of users, sources, or assertions
 *
 * Groups emerge as trust targets that users can define and trust.
 * Examples: "Climate Scientists", "Investigative Journalists", "Open Source Developers"
 */

export interface Group {
  // Identity
  groupId: string;                   // Unique identifier
  name: string;                      // Display name
  description?: string;              // What this group represents

  // Attribution
  createdBy: string;                 // userId or "system" for predefined groups
  createdAt: string;                 // ISO timestamp
  updatedAt: string;                 // ISO timestamp

  // Membership (who/what belongs to this group)
  members: GroupMember[];

  // Metadata
  isSystemDefined: boolean;          // true for built-in groups, false for user-created
  visibility: 'public' | 'private';  // Can other users see/use this group?
  tags?: string[];                   // Optional categorization
}

export interface GroupMember {
  memberId: string;                  // userId, sourceId, or assertionId
  memberType: 'user' | 'source' | 'assertion';
  addedBy: string;                   // userId who added this member
  addedAt: string;                   // ISO timestamp
  notes?: string;                    // Why they belong to this group
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
  tags?: string[];
  initialMembers?: Array<{
    memberId: string;
    memberType: 'user' | 'source' | 'assertion';
    notes?: string;
  }>;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
  tags?: string[];
}

export interface AddGroupMemberInput {
  memberId: string;
  memberType: 'user' | 'source' | 'assertion';
  notes?: string;
}
