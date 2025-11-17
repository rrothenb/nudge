/**
 * User Profile Lambda - Get and update user profile
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  userExists,
} from '../../lib/db/users';
import { getUserId, getUserEmail, parseBody } from '../../lib/utils/auth';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { updateProfileSchema } from '@nudge/shared';

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('UserProfile event:', JSON.stringify(event, null, 2));

  try {
    const userId = getUserId(event);
    const method = event.httpMethod;

    if (method === 'GET') {
      return await handleGetProfile(userId, event);
    } else if (method === 'PUT') {
      return await handleUpdateProfile(userId, event);
    }

    return errorResponse(new Error('Method not allowed'));
  } catch (error) {
    console.error('UserProfile error:', error);
    return errorResponse(error);
  }
}

/**
 * Handle GET /api/user/profile
 */
async function handleGetProfile(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Check if user profile exists, create if not
  const exists = await userExists(userId);

  if (!exists) {
    // Create new user profile
    const email = getUserEmail(event);
    const displayName = email.split('@')[0]; // Default display name from email

    console.log(`Creating new user profile for ${userId}`);
    const profile = await createUserProfile(userId, email, displayName);

    return successResponse(profile, 201);
  }

  // Get existing profile
  const profile = await getUserProfile(userId);
  return successResponse(profile);
}

/**
 * Handle PUT /api/user/profile
 */
async function handleUpdateProfile(
  userId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = parseBody(event);

  // Validate input
  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse({
      name: 'ValidationError',
      message: validation.error.message,
    });
  }

  // Update profile
  const updatedProfile = await updateUserProfile(userId, validation.data);

  return successResponse(updatedProfile);
}
