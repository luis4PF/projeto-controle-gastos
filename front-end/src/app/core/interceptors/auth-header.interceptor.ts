import { HttpInterceptorFn } from '@angular/common/http';
import { ACCESS_TOKEN_KEY } from '../constants/storage-keys';

export const authHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
