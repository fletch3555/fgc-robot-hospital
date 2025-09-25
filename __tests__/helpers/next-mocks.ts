// Test helpers for mocking Next.js API requests and responses
import { jest } from '@jest/globals';

interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface MockResponseOptions {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}

// Mock NextRequest that doesn't require edge runtime APIs
export class MockNextRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  body?: string;
  nextUrl: {
    pathname: string;
    search: string;
    searchParams: URLSearchParams;
  };
  cookies: {
    get: jest.Mock;
    set: jest.Mock;
    has: jest.Mock;
    delete: jest.Mock;
    getAll: jest.Mock;
  };

  constructor(url: string, options: MockRequestOptions = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map(Object.entries(options.headers || {}));
    this.body = options.body;
    
    // Parse URL for Next.js compatibility
    try {
      const parsedUrl = new URL(url);
      this.nextUrl = {
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        searchParams: parsedUrl.searchParams
      };
    } catch {
      this.nextUrl = {
        pathname: url,
        search: '',
        searchParams: new URLSearchParams()
      };
    }
    
    // Mock cookies
    this.cookies = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(() => [])
    };
  }
  
  async json() {
    if (this.body) {
      return JSON.parse(this.body);
    }
    return {};
  }
  
  async text() {
    return this.body || '';
  }
  
  clone() {
    return new MockNextRequest(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body
    });
  }
}

// Mock NextResponse that doesn't require edge runtime APIs
export class MockNextResponse {
  body: unknown;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  cookies: {
    set: jest.Mock;
    get: jest.Mock;
    has: jest.Mock;
    delete: jest.Mock;
    getAll: jest.Mock;
  };

  constructor(body: unknown, options: MockResponseOptions = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Map(Object.entries(options.headers || {}));
    
    // Mock cookies
    this.cookies = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(() => [])
    };
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
  
  async text() {
    if (typeof this.body === 'object') {
      return JSON.stringify(this.body);
    }
    return this.body || '';
  }
  
  clone() {
    return new MockNextResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers)
    });
  }
  
  static json(body: unknown, options: MockResponseOptions = {}) {
    return new MockNextResponse(JSON.stringify(body), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }
}

// Mock function to set up authentication for tests
export function setupAuthMock(session: unknown) {
  // Using dynamic import for test mocks
  jest.unstable_mockModule('next-auth/next', () => ({
    getServerSession: jest.fn(() => Promise.resolve(session))
  }));
  
  jest.unstable_mockModule('next-auth', () => ({
    getServerSession: jest.fn(() => Promise.resolve(session))
  }));
}

// Mock function to reset all mocks
export function resetAllMocks() {
  // Use dynamic imports for test mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
}