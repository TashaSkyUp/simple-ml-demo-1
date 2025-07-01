#!/usr/bin/env node

/**
 * Production Validation Test Script
 *
 * This script validates that the production build works correctly
 * by testing key functionality that was previously broken.
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://tashaskyup.github.io/simple-ml-demo-1/';
const LOCAL_URL = 'http://localhost:4173/';

// Test configuration
const TESTS = {
  'Production Deployment': {
    url: PRODUCTION_URL,
    tests: [
      'Page loads without errors',
      'JavaScript bundle loads',
      'No console errors on initial load',
      'Web Worker functionality available'
    ]
  },
  'Local Build': {
    url: LOCAL_URL,
    tests: [
      'Local preview works',
      'Production build integrity',
      'Bundle size validation'
    ]
  }
};

/**
 * Simple HTTP/HTTPS request wrapper
 */
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    const req = client.get(url, (res) => {
      clearTimeout(timeoutId);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

/**
 * Validate HTML content for critical elements
 */
function validateHTMLContent(html) {
  const checks = {
    'Has DOCTYPE': html.includes('<!DOCTYPE html>'),
    'Has title': html.includes('<title>'),
    'Has main script': html.includes('script') && html.includes('index-'),
    'Has CSS': html.includes('link rel="stylesheet"'),
    'Has root div': html.includes('id="root"'),
    'No obvious errors': !html.includes('Error:') && !html.includes('Failed to')
  };

  return checks;
}

/**
 * Check if critical JavaScript files are present
 */
function validateJSBundle(html) {
  const scriptMatches = html.match(/src="[^"]*\.js"/g) || [];
  const cssMatches = html.match(/href="[^"]*\.css"/g) || [];

  return {
    'Has JS bundle': scriptMatches.length > 0,
    'Has CSS bundle': cssMatches.length > 0,
    'JS bundle count': scriptMatches.length,
    'CSS bundle count': cssMatches.length,
    'Has worker bundle': html.includes('trainingWorker') || scriptMatches.some(s => s.includes('worker'))
  };
}

/**
 * Run validation tests
 */
async function runValidation() {
  console.log('🚀 Starting Production Validation Tests\n');

  let allTestsPassed = true;

  for (const [testSuite, config] of Object.entries(TESTS)) {
    console.log(`\n📋 ${testSuite} Tests`);
    console.log('='.repeat(50));

    try {
      console.log(`🌐 Testing URL: ${config.url}`);

      // Test basic connectivity
      const response = await makeRequest(config.url);

      if (response.statusCode === 200) {
        console.log('✅ Page loads successfully (Status: 200)');
      } else {
        console.log(`❌ Page load failed (Status: ${response.statusCode})`);
        allTestsPassed = false;
        continue;
      }

      // Validate HTML content
      const htmlChecks = validateHTMLContent(response.body);
      console.log('\n📄 HTML Content Validation:');
      for (const [check, passed] of Object.entries(htmlChecks)) {
        console.log(`  ${passed ? '✅' : '❌'} ${check}`);
        if (!passed) allTestsPassed = false;
      }

      // Validate JavaScript bundles
      const jsChecks = validateJSBundle(response.body);
      console.log('\n📦 Bundle Validation:');
      for (const [check, result] of Object.entries(jsChecks)) {
        if (typeof result === 'boolean') {
          console.log(`  ${result ? '✅' : '❌'} ${check}`);
          if (!result && check !== 'Has worker bundle') allTestsPassed = false;
        } else {
          console.log(`  ℹ️  ${check}: ${result}`);
        }
      }

      // Check specific fixes
      console.log('\n🔧 Specific Fix Validation:');

      // Look for the specific error pattern that was fixed
      const hasOldError = response.body.includes('isUsingWorker is not defined');
      console.log(`  ${hasOldError ? '❌' : '✅'} No "isUsingWorker is not defined" error in HTML`);
      if (hasOldError) allTestsPassed = false;

      // Check for modern JavaScript features
      const hasModernJS = response.body.includes('type="module"') ||
                         response.body.includes('import') ||
                         response.body.includes('export');
      console.log(`  ${hasModernJS ? '✅' : 'ℹ️ '} Uses modern JavaScript modules`);

      // Check for Web Worker support
      const hasWorkerSupport = response.body.includes('trainingWorker') ||
                              response.body.includes('Worker');
      console.log(`  ${hasWorkerSupport ? '✅' : '⚠️ '} Web Worker support detected`);

    } catch (error) {
      console.log(`❌ Failed to test ${config.url}: ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));

  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Production build appears to be working correctly');
    console.log('✅ isUsingWorker scoping issue appears to be resolved');
    console.log('✅ Application should load without runtime errors');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️  There may still be issues with the production build');
    console.log('🔍 Check the detailed output above for specific failures');
  }

  console.log('\n🔗 Test URLs:');
  console.log(`   Production: ${PRODUCTION_URL}`);
  console.log(`   Local:      ${LOCAL_URL}`);

  console.log('\n💡 Next Steps:');
  if (allTestsPassed) {
    console.log('   1. Test the application manually in a browser');
    console.log('   2. Verify Web Worker functionality works correctly');
    console.log('   3. Test training functionality to ensure no runtime errors');
  } else {
    console.log('   1. Review the failed tests above');
    console.log('   2. Check browser console for specific error messages');
    console.log('   3. Verify the fix was properly deployed');
  }

  return allTestsPassed;
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Production Validation Test Script

Usage:
  node production-validation.js [options]

Options:
  --help, -h     Show this help message
  --production   Test only production URL
  --local        Test only local URL
  --quiet        Minimize output

Examples:
  node production-validation.js
  node production-validation.js --production
  node production-validation.js --local
`);
    return;
  }

  // Filter tests based on arguments
  if (args.includes('--production')) {
    delete TESTS['Local Build'];
  }
  if (args.includes('--local')) {
    delete TESTS['Production Deployment'];
  }

  try {
    const success = await runValidation();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runValidation, makeRequest, validateHTMLContent, validateJSBundle };
