/**
 * Vitest setup file for frontend tests
 */

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
    href: 'http://localhost:3000',
  },
  writable: true,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
