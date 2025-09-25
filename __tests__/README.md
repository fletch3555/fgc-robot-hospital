# API Endpoint Testing Suite

This directory contains comprehensive test cases for all API endpoints in the FGC Robot Hospital application.

## Test Structure

### Core Test Files

- **`basic.test.ts`** - Basic Jest setup verification
- **`helpers/test-utils.ts`** - Mock utilities and helper functions for testing

### API Endpoint Tests

#### Main API Routes
- **`requests.test.ts`** - Tests for `/api/requests` (GET, POST)
- **`requests-id.test.ts`** - Tests for `/api/requests/[id]` (GET, PATCH)
- **`users.test.ts`** - Tests for `/api/users` (GET with role filtering)
- **`dashboard.test.ts`** - Tests for `/api/dashboard` (GET with dashboard data)
- **`spare-parts-requests.test.ts`** - Tests for `/api/spare-parts-requests` (GET, POST)
- **`fgc-inventory.test.ts`** - Tests for `/api/fgc-inventory` (GET with pagination/search)

#### Admin API Routes
- **`admin/requests.test.ts`** - Tests for `/api/admin/requests` (GET with role-based access)
- **`admin/users.test.ts`** - Tests for `/api/admin/users` (GET, POST with admin permissions)
- **`admin/roles.test.ts`** - Tests for `/api/admin/roles` (GET, POST for role management)

## Test Coverage

Each test file covers:

### ✅ Authentication & Authorization
- **401 Unauthorized** - Tests for unauthenticated access
- **403 Forbidden** - Tests for insufficient permissions
- **Role-based access control** - Admin, volunteer, lead inspector roles

### ✅ Request Validation
- **Required field validation** - Missing or invalid data
- **Data type validation** - Proper request payload structure
- **Business logic validation** - Country codes, inventory existence, etc.

### ✅ Success Scenarios
- **Valid requests** - Proper data handling and responses
- **Data transformation** - Response formatting and sanitization
- **Pagination** - Page-based data retrieval
- **Search functionality** - Query parameter handling

### ✅ Error Handling
- **Database errors** - Graceful error responses
- **Network errors** - Proper error propagation
- **Data consistency** - Edge case handling

### ✅ Security
- **Data sanitization** - Removing sensitive information from responses
- **Input validation** - Preventing injection attacks
- **Session management** - Proper user context handling

## Mock Strategy

### Database Mocking
- **Connection mocking** - `connectToDatabase()` function
- **Query mocking** - Direct database query functions
- **Model mocking** - ORM/model method mocking

### Authentication Mocking
- **Session mocking** - Next-auth session simulation
- **Role simulation** - Different user role scenarios
- **Permission testing** - Role-based access verification

### External Service Mocking
- **Country validation** - Country code utility functions
- **Image processing** - File upload and processing mocks

## Test Scenarios by Endpoint

### `/api/requests`
- ✅ List requests (authenticated users only)
- ✅ Create new requests (with type-specific data)
- ✅ Validation of required fields
- ✅ Database error handling

### `/api/requests/[id]`
- ✅ Get specific request by ID
- ✅ Update request status and data
- ✅ 404 handling for non-existent requests
- ✅ Ownership/permission validation

### `/api/users`
- ✅ List all users (authenticated)
- ✅ Filter users by roles
- ✅ Data sanitization (removing passwords)
- ✅ Role-based filtering

### `/api/dashboard`
- ✅ Dashboard summary statistics
- ✅ Request counts by type and status
- ✅ Recent requests limiting
- ✅ Date-based filtering

### `/api/spare-parts-requests`
- ✅ List spare parts requests
- ✅ Create new spare parts requests
- ✅ Inventory validation
- ✅ Country code validation
- ✅ Dashboard mode responses

### `/api/fgc-inventory`
- ✅ Paginated inventory listing
- ✅ Search functionality
- ✅ Dashboard summary data
- ✅ Empty result handling

### Admin Endpoints
- ✅ `/api/admin/requests` - Admin-only request access
- ✅ `/api/admin/users` - User management operations
- ✅ `/api/admin/roles` - Role and permission management

## Running Tests

### Run All Tests
\`\`\`bash
npm test
\`\`\`

### Run Specific Test File
\`\`\`bash
npm test requests.test.ts
\`\`\`

### Run Tests with Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

### Run Tests in Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

## Test Data Patterns

### Mock User Sessions
- **Regular User** - Basic volunteer permissions
- **Admin User** - Full administrative access
- **Lead Inspector** - Enhanced inspection permissions

### Mock Request Data
- **Hardware Requests** - Motor, sensor, and component requests
- **Software Requests** - Code assistance and debugging
- **Machine Shop Requests** - Custom part fabrication
- **Battery Charging Requests** - Battery management

### Mock API Responses
- **Success Responses** - Proper data structure
- **Error Responses** - Consistent error formatting
- **Pagination Data** - Page, limit, total metadata

## Notes

- Tests use **Node.js environment** for API endpoint testing
- **Mocking strategy** isolates unit tests from external dependencies
- **Type safety** maintained with TypeScript throughout tests
- **Async handling** properly tested for all database operations
- **Edge cases** covered including empty results and error conditions