  import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

type NodeEnv = 'development' | 'test' | 'production';
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface EnvConfig {
  NODE_ENV: NodeEnv;
  PORT: number;
  MONGO_URI: string;
  LOG_LEVEL: LogLevel;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  CLIENT_VERSION: number;
  PAYMENT_SUCCESS_REDIRECT_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  FROM_EMAIL: string;
  GCP_PROJECT_ID:string;
  GCP_SA_KEY:string;
  GCP_BUCKET_NAME:string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const env: EnvConfig = {
  NODE_ENV: (process.env.NODE_ENV as NodeEnv) || 'development',
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  MONGO_URI: getEnvVar('MONGO_URI'),
  LOG_LEVEL: (process.env.LOG_LEVEL as LogLevel) || 'info',
  CLIENT_ID: getEnvVar("CLIENT_ID"),
  CLIENT_SECRET: getEnvVar("CLIENT_SECRET"),
  CLIENT_VERSION: parseInt(getEnvVar("CLIENT_VERSION")),
  PAYMENT_SUCCESS_REDIRECT_URL: getEnvVar("PAYMENT_SUCCESS_REDIRECT_URL"),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '15m'),
  REFRESH_TOKEN_SECRET: getEnvVar('REFRESH_TOKEN_SECRET'),
  REFRESH_TOKEN_EXPIRES_IN: getEnvVar('REFRESH_TOKEN_EXPIRES_IN', '7d'),
  SMTP_HOST: getEnvVar('SMTP_HOST', 'localhost'),
  SMTP_PORT: parseInt(getEnvVar('SMTP_PORT', '1025'), 10),
  SMTP_USER: getEnvVar('SMTP_USER', ''),
  SMTP_PASS: getEnvVar('SMTP_PASS', ''),
  FROM_EMAIL: getEnvVar('FROM_EMAIL', 'no-reply@mend.com'),
  GCP_PROJECT_ID: getEnvVar("GCP_PROJECT_ID", ''),
  GCP_SA_KEY: getEnvVar("GCP_SA_KEY",''),
  GCP_BUCKET_NAME : getEnvVar("GCP_BUCKET_NAME",'')
};

