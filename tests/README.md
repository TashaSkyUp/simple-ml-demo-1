# Tests Directory

This directory contains all test files for the Interactive CNN Trainer project, organized by test type and scope.

## Directory Structure

```
tests/
├── unit/           # Unit tests for individual components and utilities
├── integration/    # Integration tests for component interactions
├── e2e/           # End-to-end tests for complete user workflows
└── README.md      # This file
```

## Test Types

### Unit Tests (`unit/`)
Test individual functions, components, and utilities in isolation.

**Current Tests:**
- `session_test.ts` - Session management functionality validation
  - Session data structure validation
  - Serialization/deserialization testing
  - Session statistics calculation
  - Invalid session handling

**Running Unit Tests:**
```bash
# TypeScript/Node.js tests
cd tests/unit
npx ts-node session_test.ts
```

### Integration Tests (`integration/`)
Test interactions between multiple components and systems.

**Current Tests:**
- `fixes-test.html` - Browser-based integration tests
  - localStorage quota management testing
  - Web Worker enum serialization testing
  - Message passing validation
  - TensorFlow.js backend integration

**Running Integration Tests:**
1. Start the development server: `npm run dev`
2. Open `http://localhost:5173/tests/integration/fixes-test.html`
3. Click "Run Tests" to execute all integration tests

### End-to-End Tests (`e2e/`)
Test complete user workflows and application behavior.

**Planned Tests:**
- Complete training workflow (draw → train → predict)
- Session save/load functionality
- Camera integration testing
- Cross-browser compatibility
- Performance benchmarking

## Test Guidelines

### Adding New Tests

1. **Unit Tests**: Create `.test.ts` files in `unit/` directory
2. **Integration Tests**: Create `.html` files in `integration/` directory
3. **E2E Tests**: Create test scripts in `e2e/` directory

### Test File Naming Convention

- Unit tests: `[component-name].test.ts`
- Integration tests: `[feature-name]-test.html`
- E2E tests: `[workflow-name].e2e.js`

### Test Implementation Standards

#### Unit Tests
```typescript
// Example unit test structure
describe('ComponentName', () => {
  test('should do something', () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

#### Integration Tests
```html
<!-- Example integration test structure -->
<!DOCTYPE html>
<html>
<head>
    <title>Feature Integration Test</title>
</head>
<body>
    <div id="test-results"></div>
    <script>
        async function runTests() {
            // Test setup
            // Test execution
            // Results reporting
        }
    </script>
</body>
</html>
```

## Running All Tests

### Prerequisites
- Node.js 18+ installed
- Dependencies installed: `npm install`
- Development server running: `npm run dev`

### Test Execution

1. **Unit Tests:**
   ```bash
   cd tests/unit
   npx ts-node session_test.ts
   ```

2. **Integration Tests:**
   - Navigate to `http://localhost:5173/tests/integration/fixes-test.html`
   - Click "Run Tests" button
   - Check browser console for detailed results

3. **Manual Testing:**
   - Follow the comprehensive testing guide in `/TESTING_GUIDE.md`
   - Use the built-in test suite in the main application

## Test Coverage Areas

### Core Functionality
- ✅ Session management (unit tests)
- ✅ localStorage quota handling (integration tests)
- ✅ Web Worker communication (integration tests)
- ✅ Enum serialization (integration tests)
- 🔄 TensorFlow.js model operations (planned)
- 🔄 Canvas drawing functionality (planned)

### User Interface
- 🔄 Component rendering (planned)
- 🔄 User interactions (planned)
- 🔄 Responsive design (planned)
- 🔄 Accessibility (planned)

### Performance
- 🔄 Training speed benchmarks (planned)
- 🔄 Memory usage validation (planned)
- 🔄 GPU acceleration testing (planned)

### Browser Compatibility
- 🔄 Chrome/Edge testing (planned)
- 🔄 Firefox testing (planned)
- 🔄 Safari testing (planned)
- 🔄 Mobile browser testing (planned)

## Test Data

### Sample Data Files
- Session files with various configurations
- Training data samples
- Model weight examples

### Test Fixtures
Test fixtures and mock data should be placed in a `fixtures/` subdirectory within each test type directory.

## Continuous Integration

### GitHub Actions Integration
Tests can be integrated with GitHub Actions for automated testing:

```yaml
# Example .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
```

### Local Testing Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "cd tests/unit && find . -name '*.test.ts' -exec npx ts-node {} \\;",
    "test:integration": "echo 'Open http://localhost:5173/tests/integration/ for integration tests'",
    "test:watch": "npm run test -- --watch"
  }
}
```

## Debugging Tests

### Browser Developer Tools
- Use browser console for integration test debugging
- Network tab for API/resource loading issues
- Performance tab for performance test analysis

### Node.js Debugging
```bash
# Debug unit tests
node --inspect-brk node_modules/.bin/ts-node tests/unit/session_test.ts
```

### Test Logging
- Unit tests: Use `console.log()` for debug output
- Integration tests: Use browser console and DOM elements
- E2E tests: Use test framework logging

## Best Practices

### Test Independence
- Each test should be independent and not rely on other tests
- Clean up resources after each test
- Use fresh data for each test run

### Realistic Test Data
- Use realistic data sizes and structures
- Test edge cases and boundary conditions
- Include both valid and invalid input scenarios

### Performance Considerations
- Keep tests fast and focused
- Use mocks for external dependencies
- Avoid unnecessary DOM manipulations in unit tests

### Documentation
- Document test purpose and expected behavior
- Include examples of expected input/output
- Explain complex test scenarios

## Contributing

### Adding New Tests
1. Choose appropriate test type (unit/integration/e2e)
2. Follow naming conventions
3. Include test documentation
4. Update this README if adding new test categories

### Test Review Process
1. Ensure tests cover both success and failure cases
2. Verify test independence
3. Check performance impact
4. Validate cross-browser compatibility (for integration/e2e tests)

## Resources

### Testing Libraries
- TypeScript: Built-in Node.js testing
- Browser: Vanilla JavaScript with HTML test runners
- Future: Jest, Cypress, or Playwright for advanced testing

### Documentation
- Main project: `/README.md`
- Testing guide: `/TESTING_GUIDE.md`
- API documentation: `/docs/`

### External Resources
- [TensorFlow.js Testing Guide](https://www.tensorflow.org/js/guide/testing)
- [Web Worker Testing Patterns](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Canvas Testing Techniques](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

---

For questions about testing or to report issues with tests, please refer to the main project documentation or create an issue in the project repository.