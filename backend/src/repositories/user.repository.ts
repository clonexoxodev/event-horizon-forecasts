import { supabase } from '../db/supabase-client.js';
import { User, CreateUserRequest, UserResponse } from '../types/user.js';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        email: userData.email,
        password_hash: userData.password_hash
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create user: ' + error.message);
    }

    return data;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error('Failed to find user: ' + error.message);
    }

    return data;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error('Failed to find user: ' + error.message);
    }

    return data;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error('Failed to find user: ' + error.message);
    }

    return data;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Failed to check email: ' + error.message);
    }

    return data !== null;
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Failed to check username: ' + error.message);
    }

    return data !== null;
  }

  /**
   * Convert User to UserResponse (remove sensitive data)
   */
  toUserResponse(user: User): UserResponse {
    const { password_hash, ...userResponse } = user;
    return userResponse;
  }
}