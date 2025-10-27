// Optional: configure or set up a testing framework before each test
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock Web APIs for Next.js environment
class MockHeaders extends Map {
  get(key) {
    return super.get(key?.toLowerCase());
  }
  
  set(key, value) {
    return super.set(key?.toLowerCase(), value);
  }
  
  has(key) {
    return super.has(key?.toLowerCase());
  }
  
  delete(key) {
    return super.delete(key?.toLowerCase());
  }
  
  append(key, value) {
    const existing = this.get(key);
    if (existing) {
      this.set(key, `${existing}, ${value}`);
    } else {
      this.set(key, value);
    }
  }
  
  getSetCookie() {
    return [];
  }
}

class MockRequestCookies {
  constructor() {
    this.cookies = new Map();
  }
  
  get(name) {
    return this.cookies.get(name);
  }
  
  set(name, value) {
    this.cookies.set(name, value);
  }
  
  has(name) {
    return this.cookies.has(name);
  }
  
  delete(name) {
    this.cookies.delete(name);
  }
  
  getAll() {
    return Array.from(this.cookies.entries()).map(([name, value]) => ({ name, value }));
  }
}

class MockResponseCookies {
  constructor() {
    this.cookies = new Map();
  }
  
  set(name, value, options = {}) {
    this.cookies.set(name, { value, ...options });
  }
  
  get(name) {
    return this.cookies.get(name);
  }
  
  has(name) {
    return this.cookies.has(name);
  }
  
  delete(name) {
    this.cookies.delete(name);
  }
  
  getAll() {
    return Array.from(this.cookies.entries()).map(([name, data]) => ({ name, ...data }));
  }
}

// Mock Request with proper cookies and Next.js properties
global.Request = global.Request || class Request {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new MockHeaders(Object.entries(options.headers || {}));
    this.body = options.body;
    this.cookies = new MockRequestCookies();
    
    // Mock URL parsing for Next.js
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
  }
  
  json() {
    if (this.body) {
      return Promise.resolve(JSON.parse(this.body));
    }
    return Promise.resolve({});
  }
  
  text() {
    return Promise.resolve(this.body || '');
  }
  
  clone() {
    return new Request(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body
    });
  }
};

// Mock Response with proper cookies and Next.js properties
global.Response = global.Response || class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new MockHeaders(Object.entries(options.headers || {}));
    this.cookies = new MockResponseCookies();
  }
  
  json() {
    if (typeof this.body === 'string') {
      return Promise.resolve(JSON.parse(this.body));
    }
    return Promise.resolve(this.body);
  }
  
  text() {
    if (typeof this.body === 'object') {
      return Promise.resolve(JSON.stringify(this.body));
    }
    return Promise.resolve(this.body || '');
  }
  
  clone() {
    return new Response(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers)
    });
  }
  
  static json(body, options = {}) {
    return new Response(JSON.stringify(body), {
      status: 200,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }
};

// Mock URL if not available
global.URL = global.URL || class URL {
  constructor(url, base) {
    // Simple URL parsing for tests
    const fullUrl = base ? `${base}${url}` : url;
    const parts = fullUrl.split('?');
    this.pathname = parts[0].replace(/^https?:\/\/[^\/]+/, '') || '/';
    this.search = parts[1] ? `?${parts[1]}` : '';
    this.searchParams = new URLSearchParams(this.search);
    this.href = fullUrl;
  }
};

// Mock NextRequest and NextResponse from Next.js
jest.mock('next/server', () => {
  const MockNextRequest = class {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new MockHeaders(Object.entries(options.headers || {}));
      this.body = options.body;
      this.cookies = new MockRequestCookies();
      
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
    }
    
    json() {
      if (this.body) {
        return Promise.resolve(JSON.parse(this.body));
      }
      return Promise.resolve({});
    }
    
    text() {
      return Promise.resolve(this.body || '');
    }
    
    clone() {
      return new MockNextRequest(this.url, {
        method: this.method,
        headers: Object.fromEntries(this.headers),
        body: this.body
      });
    }
  };

  const MockNextResponse = class extends global.Response {
    constructor(body, options = {}) {
      super(body, options);
    }
    
    static json(body, options = {}) {
      return new MockNextResponse(JSON.stringify(body), {
        status: 200,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
    }
  };

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse
  };
});

// Global mocks that need to be set up before any imports
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn(),
  })),
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/next", () => ({
  __esModule: true,
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/providers/slack", () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock("./src/lib/database", () => ({
  connectToDatabase: jest.fn(),
  query: jest.fn(),
}));

jest.mock("./src/models/Request", () => ({
  Request: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAllForAdmin: jest.fn(),
    findRecentlyClosed: jest.fn(),
  },
}));

jest.mock("./src/models/User", () => ({
  User: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByRoles: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("./src/models/SparePart", () => ({
  SparePart: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Basic test setup without jest-dom since we're testing API endpoints
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};