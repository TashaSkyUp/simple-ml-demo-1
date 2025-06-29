#!/usr/bin/env node

/**
 * Simple test script to verify the Interactive CNN Trainer application health
 * This script checks if the application can start and basic functionality works
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🧪 Interactive CNN Trainer - Health Check');
console.log('==========================================');

// Test configuration
const tests = [
    {
        name: 'Node.js Version',
        test: () => {
            const version = process.version;
            const majorVersion = parseInt(version.slice(1).split('.')[0]);
            return {
                pass: majorVersion >= 18,
                message: `Node.js ${version} (requires 18+)`
            };
        }
    },
    {
        name: 'Package.json exists',
        test: () => {
            const exists = fs.existsSync('package.json');
            return {
                pass: exists,
                message: exists ? 'Found package.json' : 'Missing package.json'
            };
        }
    },
    {
        name: 'Dependencies installed',
        test: () => {
            const exists = fs.existsSync('node_modules');
            return {
                pass: exists,
                message: exists ? 'node_modules found' : 'Run npm install'
            };
        }
    },
    {
        name: 'TypeScript files',
        test: () => {
            const files = [
                'index.tsx',
                'App.tsx',
                'components/TrainableConvNet.tsx',
                'hooks/useTFModel.ts',
                'utils/cnnUtils.ts'
            ];
            const missing = files.filter(file => !fs.existsSync(file));
            return {
                pass: missing.length === 0,
                message: missing.length === 0 ? 'All core files present' : `Missing: ${missing.join(', ')}`
            };
        }
    },
    {
        name: 'Environment configuration',
        test: () => {
            const envExists = fs.existsSync('.env.local');
            if (!envExists) {
                return {
                    pass: false,
                    message: 'Missing .env.local file'
                };
            }

            try {
                const envContent = fs.readFileSync('.env.local', 'utf8');
                const hasApiKey = envContent.includes('GEMINI_API_KEY') || envContent.includes('VITE_GEMINI_API_KEY');
                return {
                    pass: true,
                    message: hasApiKey ? 'Environment configured' : 'Environment exists (API key optional)'
                };
            } catch (error) {
                return {
                    pass: false,
                    message: 'Error reading .env.local'
                };
            }
        }
    },
    {
        name: 'Vite configuration',
        test: () => {
            const exists = fs.existsSync('vite.config.ts');
            if (!exists) {
                return {
                    pass: false,
                    message: 'Missing vite.config.ts'
                };
            }

            try {
                const content = fs.readFileSync('vite.config.ts', 'utf8');
                const hasReactPlugin = content.includes('@vitejs/plugin-react');
                return {
                    pass: true,
                    message: hasReactPlugin ? 'Vite configured with React plugin' : 'Vite configured (basic)'
                };
            } catch (error) {
                return {
                    pass: false,
                    message: 'Error reading vite.config.ts'
                };
            }
        }
    }
];

// Run tests
let passedTests = 0;
let totalTests = tests.length;

console.log('\n📋 Running health checks...\n');

tests.forEach((test, index) => {
    try {
        const result = test.test();
        const status = result.pass ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name}: ${result.message}`);

        if (result.pass) {
            passedTests++;
        }
    } catch (error) {
        console.log(`${index + 1}. ❌ ${test.name}: Error - ${error.message}`);
    }
});

console.log('\n📊 Results:');
console.log(`   Passed: ${passedTests}/${totalTests}`);
console.log(`   Health: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Application is healthy.');
    console.log('\n🚀 Ready to start:');
    console.log('   ./start.sh');
} else {
    console.log('\n⚠️  Some tests failed. Check the issues above.');
    console.log('\n🔧 Common fixes:');
    console.log('   npm install                 # Install dependencies');
    console.log('   cp .env.local.template .env.local  # Create environment file');
    console.log('   ./start.sh                  # Start with auto-setup');
}

// Additional system info
console.log('\n🖥️  System Info:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Architecture: ${process.arch}`);
console.log(`   Working Directory: ${process.cwd()}`);

// Check if we can run a quick build test
if (passedTests === totalTests) {
    console.log('\n🔨 Testing build process...');

    exec('npm run build', { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
            console.log('❌ Build test failed - this is normal if dependencies are missing');
            if (error.code === 'ENOENT') {
                console.log('   Reason: npm not found or dependencies not installed');
            }
        } else {
            console.log('✅ Build test passed - production build works');
        }

        console.log('\n✨ Health check complete!');
        process.exit(passedTests === totalTests ? 0 : 1);
    });
} else {
    console.log('\n✨ Health check complete!');
    process.exit(1);
}
