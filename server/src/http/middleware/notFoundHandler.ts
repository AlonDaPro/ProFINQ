import type { RequestHandler } from 'express';
import { ErrorCode } from '../../constants/errorCode.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import { errorBody } from '../apiErrorBody.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(HttpStatus.NotFound).json(errorBody(ErrorCode.RouteNotFound, `No route for ${req.method} ${req.path}`));
};
