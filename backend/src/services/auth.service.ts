import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateUserRequest, LoginRequest, AuthResponse } from '../types/user.js';
import { supabase } from '../db/supabase-client.js';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export class AuthService {
  private userRepository: UserRepository;
  private jwtSecret: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = requireEnv('JWT_SECRET');
  }

  /**
   * Register a new user with automatic wallet creation using Supabase
   */
  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    // Validate input
    this.validateRegistrationData(userData);

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${userData.email},username.eq.${userData.username}`);

    if (checkError) {
      throw new Error('Database error: ' + checkError.message);
    }

    if (existingUsers && existingUsers.length > 0) {
      const { data: emailCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();
      
      if (emailCheck) {
        throw new Error('Email already exists');
      } else {
        throw new Error('Username already exists');
      }
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    // Check if this is the primary super admin email
    const isPrimarySuperAdmin = userData.email.toLowerCase() === 'fehintoluwaolu@gmail.com';
    const role = isPrimarySuperAdmin ? 'super_admin' : 'user';

    try {
      // Create user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          username: userData.username.trim(),
          email: userData.email.trim().toLowerCase(),
          password_hash: password_hash,
          role: role
        })
        .select()
        .single();

      if (userError) {
        throw new Error('Failed to create user: ' + userError.message);
      }

      // Create zero-balance wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: newUser.id,
          balance_ngn_kobo: 0,
          balance_usd_cents: 0,
          available_ngn_kobo: 0,
          available_usd_cents: 0
        })
        .select()
        .single();

      if (walletError) {
        // If wallet creation fails, we should delete the user
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new Error('Failed to create wallet: ' + walletError.message);
      }

      // Generate JWT token
      const token = this.generateToken(newUser);

      // Return auth response
      return {
        user: this.userRepository.toUserResponse(newUser),
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user using Supabase
   */
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    // Validate input
    this.validateLoginData(loginData);

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', loginData.email.trim().toLowerCase())
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if this is the primary super admin email and ensure role is set
    if (loginData.email.trim().toLowerCase() === 'fehintoluwaolu@gmail.com' && user.role !== 'super_admin') {
      // Update role to super_admin
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'super_admin' })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update primary super admin role:', updateError);
      } else {
        user.role = updatedUser.role;
      }
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Return auth response
    return {
      user: this.userRepository.toUserResponse(user),
      token
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: any): string {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h'
    });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: CreateUserRequest): void {
    // Trim all string inputs
    const username = data.username?.trim();
    const email = data.email?.trim();
    
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!data.password || data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Username validation
    if (username.length > 50) {
      throw new Error('Username must be less than 50 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    // Update the data object with trimmed values
    data.username = username;
    data.email = email;
  }

  /**
   * Validate login data
   */
  private validateLoginData(data: LoginRequest): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (!data.password) {
      throw new Error('Password is required');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
