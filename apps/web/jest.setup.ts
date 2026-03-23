import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
if (typeof window !== 'undefined' && window.navigator) {
  Object.defineProperty(window.navigator, 'vibrate', {
    value: jest.fn(),
    writable: true
  });
}
