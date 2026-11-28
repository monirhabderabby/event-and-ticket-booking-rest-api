import { Response } from "express";

export interface ApiResponseOptions<T, M = Record<string, unknown>> {
  statusCode?: number;
  success?: boolean;
  message: string;
  data?: T;
  meta?: M;
}

export const sendResponse = <T, M = Record<string, unknown>>(
  res: Response,
  {
    statusCode = 200,
    success = true,
    message,
    data,
    meta,
  }: ApiResponseOptions<T, M>,
): Response => {
  const payload: {
    success: boolean;
    message: string;
    data?: T;
    meta?: M;
  } = {
    success,
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};
