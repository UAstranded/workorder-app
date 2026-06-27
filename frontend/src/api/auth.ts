import client from './client';
import { User } from '../types';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post('/auth/login', { username, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get('/auth/me');
  return data;
}
