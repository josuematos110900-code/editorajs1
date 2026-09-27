import type { BookInput } from '../../data';
import type { Book } from '../../types';

export function bookToInput(b: Book): BookInput {
  const { isDemo: _d, createdAt: _c, ...rest } = b;
  return rest;
}
