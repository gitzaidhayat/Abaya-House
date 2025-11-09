import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateAccessToken = userId => {
  return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

export const generateRefreshToken = userId => {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyRefreshToken = token => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookies = res => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
