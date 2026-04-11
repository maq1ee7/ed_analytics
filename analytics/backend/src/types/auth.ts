export interface User {
  id: number;
  username: string;
  role: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: User;
}

// Расширение глобального namespace Express для TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
