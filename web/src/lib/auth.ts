'use client';

import { getMe, type User } from './api';

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await getMe();
  } catch {
    return null;
  }
}
