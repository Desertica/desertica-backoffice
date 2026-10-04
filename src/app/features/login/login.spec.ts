import { ApiError } from '../../core/api/api-error';
import { loginErrorKey } from './login';

describe('loginErrorKey', () => {
  it('maps API rejections to translated messages', () => {
    expect(loginErrorKey(new ApiError(401, 'x'))).toBe('login.error.401');
    expect(loginErrorKey(new ApiError(403, 'x'))).toBe('login.error.403');
    expect(loginErrorKey(new ApiError(500, 'x'))).toBe('login.error.generic');
    expect(loginErrorKey(new TypeError('network'))).toBe('login.error.generic');
  });
});
