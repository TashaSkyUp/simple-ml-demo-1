#!/usr/bin/env node

/**
 * Test Runner for Interactive CNN Trainer
 * Runs all unit tests and reports results
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.testDir = path.join(__dirname, "unit");
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  async findTestFiles() {
    try {
      const files = fs.readdirSync(this.testDir);
      return files.filter(
        (file) =>
          file.endsWith(".test.ts") ||
          file.endsWith(".test.js") ||
          file.endsWith("_test.ts") ||
          file.endsWith("_test.js"),
      );
    } catch (error) {
      console.error("Error reading test directory:", error.message);
      return [];
    }
  }

  async runTest(testFile) {
    return new Promise((resolve) => {
      const testPath = path.join(this.testDir, testFile);
      console.log(`\n🧪 Running: ${testFile}`);
      console.log("─".repeat(50));

      const child = spawn("npx", ["tsx", testPath], {
        stdio: "pipe",
        cwd: path.join(__dirname, ".."),
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        this.results.total++;

        if (code === 0) {
          console.log(stdout);
          if (stdout.includes("Success") || stdout.includes("PASS")) {
            this.results.passed++;
            console.log("✅ PASSED");
          } else {
            this.results.failed++;
            console.log("❌ FAILED (no success indicators)");
            this.results.errors.push(
              `${testFile}: No success indicators found`,
            );
          }
        } else {
          this.results.failed++;
          console.log("❌ FAILED");
          console.log("STDOUT:", stdout);
          console.log("STDERR:", stderr);
          this.results.errors.push(`${testFile}: Exit code ${code}`);
        }

        resolve();
      });

      child.on("error", (error) => {
        this.results.total++;
        this.results.failed++;
        console.log("❌ ERROR:", error.message);
        this.results.errors.push(`${testFile}: ${error.message}`);
        resolve();
      });
    });
  }

  async runIntegrationTests() {
    console.log("\n🌐 Integration Tests");
    console.log("═".repeat(50));
    console.log("To run integration tests:");
    console.log("1. Start the dev server: npm run dev");
    console.log(
      "2. Open: http://localhost:5173/tests/integration/fixes-test.html",
    );
    console.log('3. Click "Run Tests" button');
    console.log("4. Check browser console for results");
  }

  printSummary() {
    console.log("\n📊 Test Summary");
    console.log("═".repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);

    if (this.results.errors.length > 0) {
      console.log("\n❌ Errors:");
      this.results.errors.forEach((error) => {
        console.log(`  • ${error}`);
      });
    }

    const successRate =
      this.results.total > 0
        ? ((this.results.passed / this.results.total) * 100).toFixed(1)
        : 0;

    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log(
        "\n⚠️  Some tests failed. Check the output above for details.",
      );
    }
  }

  async run() {
    console.log("🚀 Interactive CNN Trainer - Test Runner");
    console.log("═".repeat(50));

    // Check if ts-node is available
    try {
      await new Promise((resolve, reject) => {
        const child = spawn("npx", ["tsx", "--version"], { stdio: "pipe" });
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error("tsx not available"));
        });
        child.on("error", reject);
      });
    } catch (error) {
      console.log("❌ tsx is required to run TypeScript tests");
      console.log("Install it with: npm install --save-dev tsx");
      console.log("Or install project dependencies: npm install");
      process.exit(1);
    }

    // Find and run unit tests
    const testFiles = await this.findTestFiles();

    if (testFiles.length === 0) {
      console.log("📂 No unit test files found in", this.testDir);
      console.log(
        "Looking for files ending with: .test.ts, .test.js, _test.ts, _test.js",
      );
    } else {
      console.log(`📂 Found ${testFiles.length} test file(s)`);

      for (const testFile of testFiles) {
        await this.runTest(testFile);
      }
    }

    // Show integration test instructions
    await this.runIntegrationTests();

    // Print summary
    this.printSummary();

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.run().catch((error) => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}

export default TestRunner;
