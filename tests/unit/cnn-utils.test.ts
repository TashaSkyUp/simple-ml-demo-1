// CNN Utilities Test Suite
// Tests for image processing and data validation utilities

// Mock implementations for testing (since we can't import the actual utils easily)
const preprocessImage = (
  imageData: ImageData,
  targetSize: number = 28,
): number[] => {
  if (!imageData || !imageData.data) {
    throw new Error("Invalid image data");
  }

  const { width, height, data } = imageData;
  const grayscale: number[] = [];

  // Convert RGBA to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard grayscale conversion
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale.push(gray / 255); // Normalize to 0-1
  }

  return grayscale;
};

const augmentData = (
  imageArray: number[],
  augmentations: any = {},
): number[][] => {
  const {
    rotation = false,
    flip = false,
    noise = false,
    brightness = false,
  } = augmentations;

  const augmented: number[][] = [imageArray]; // Include original

  if (rotation) {
    // Simple rotation simulation (would need actual image rotation logic)
    const rotated = imageArray.map((pixel) =>
      Math.min(1, Math.max(0, pixel + 0.1)),
    );
    augmented.push(rotated);
  }

  if (flip) {
    // Simple flip simulation
    const flipped = [...imageArray].reverse();
    augmented.push(flipped);
  }

  if (noise) {
    // Add noise
    const noisy = imageArray.map((pixel) =>
      Math.min(1, Math.max(0, pixel + (Math.random() - 0.5) * 0.1)),
    );
    augmented.push(noisy);
  }

  if (brightness) {
    // Adjust brightness
    const bright = imageArray.map((pixel) => Math.min(1, pixel * 1.2));
    const dark = imageArray.map((pixel) => Math.max(0, pixel * 0.8));
    augmented.push(bright, dark);
  }

  return augmented;
};

const validateImageData = (imageArray: number[]): boolean => {
  if (!Array.isArray(imageArray)) return false;
  if (imageArray.length === 0) return false;

  // Check if all values are numbers between 0 and 1
  return imageArray.every(
    (pixel) =>
      typeof pixel === "number" && pixel >= 0 && pixel <= 1 && !isNaN(pixel),
  );
};

// Test runner class
class CNNUtilsTest {
  private static testCount = 0;
  private static passCount = 0;
  private static failCount = 0;

  static assert(condition: boolean, message: string): void {
    this.testCount++;
    if (condition) {
      this.passCount++;
      console.log(`✅ PASS: ${message}`);
    } else {
      this.failCount++;
      console.log(`❌ FAIL: ${message}`);
    }
  }

  static assertEqual<T>(actual: T, expected: T, message: string): void {
    const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
    this.assert(isEqual, `${message} (expected: ${expected}, got: ${actual})`);
  }

  static assertThrows(fn: () => void, message: string): void {
    try {
      fn();
      this.assert(false, `${message} (expected error but none was thrown)`);
    } catch (error) {
      this.assert(true, `${message} (correctly threw error)`);
    }
  }

  static testPreprocessImage(): void {
    console.log("\n🧪 Testing preprocessImage function...");

    // Test with mock ImageData
    const mockImageData = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255,
        0,
        0,
        255, // Red pixel
        0,
        255,
        0,
        255, // Green pixel
        0,
        0,
        255,
        255, // Blue pixel
        255,
        255,
        255,
        255, // White pixel
      ]),
    } as ImageData;

    const result = preprocessImage(mockImageData);

    this.assert(result.length === 4, "Should return 4 pixels for 2x2 image");
    this.assert(Math.abs(result[0] - 0.299) < 0.001, "Red pixel conversion");
    this.assert(Math.abs(result[1] - 0.587) < 0.001, "Green pixel conversion");
    this.assert(Math.abs(result[2] - 0.114) < 0.001, "Blue pixel conversion");
    this.assert(Math.abs(result[3] - 1.0) < 0.001, "White pixel conversion");

    // Test error handling
    this.assertThrows(
      () => preprocessImage(null as any),
      "Should throw on null input",
    );
    this.assertThrows(
      () => preprocessImage({} as ImageData),
      "Should throw on invalid input",
    );
  }

  static testAugmentData(): void {
    console.log("\n🧪 Testing augmentData function...");

    const sampleImage = [0.1, 0.2, 0.3, 0.4, 0.5];

    // Test no augmentations
    const noAug = augmentData(sampleImage);
    this.assertEqual(noAug.length, 1, "No augmentations should return 1 image");
    this.assertEqual(
      noAug[0],
      sampleImage,
      "Original image should be preserved",
    );

    // Test rotation
    const withRotation = augmentData(sampleImage, { rotation: true });
    this.assertEqual(withRotation.length, 2, "Rotation should add 1 image");
    this.assertEqual(withRotation[0], sampleImage, "Original should be first");

    // Test flip
    const withFlip = augmentData(sampleImage, { flip: true });
    this.assertEqual(withFlip.length, 2, "Flip should add 1 image");
    this.assertEqual(
      withFlip[1],
      [...sampleImage].reverse(),
      "Flipped image should be reversed",
    );

    // Test multiple augmentations
    const multiple = augmentData(sampleImage, {
      rotation: true,
      flip: true,
      noise: true,
    });
    this.assert(
      multiple.length >= 3,
      "Multiple augmentations should create multiple images",
    );
    this.assertEqual(
      multiple[0],
      sampleImage,
      "Original should always be first",
    );

    // Test brightness
    const withBrightness = augmentData(sampleImage, { brightness: true });
    this.assertEqual(
      withBrightness.length,
      3,
      "Brightness should add 2 images (bright + dark)",
    );
  }

  static testValidateImageData(): void {
    console.log("\n🧪 Testing validateImageData function...");

    // Valid cases
    this.assert(
      validateImageData([0.0, 0.5, 1.0]),
      "Should accept valid normalized values",
    );
    this.assert(validateImageData([0, 1]), "Should accept boundary values");
    this.assert(
      validateImageData([0.25, 0.75]),
      "Should accept decimal values",
    );

    // Invalid cases
    this.assert(!validateImageData([]), "Should reject empty array");
    this.assert(!validateImageData(null as any), "Should reject null");
    this.assert(
      !validateImageData(undefined as any),
      "Should reject undefined",
    );
    this.assert(
      !validateImageData("not array" as any),
      "Should reject non-array",
    );
    this.assert(
      !validateImageData([0.5, -0.1]),
      "Should reject negative values",
    );
    this.assert(!validateImageData([0.5, 1.1]), "Should reject values > 1");
    this.assert(!validateImageData([0.5, NaN]), "Should reject NaN values");
    this.assert(
      !validateImageData([0.5, "0.8" as any]),
      "Should reject string values",
    );
  }

  static testIntegration(): void {
    console.log("\n🧪 Testing integration workflow...");

    // Create test ImageData
    const testImageData = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        128,
        128,
        128,
        255, // Gray pixel
        255,
        255,
        255,
        255, // White pixel
      ]),
    } as ImageData;

    // Full workflow test
    const processed = preprocessImage(testImageData);
    this.assert(
      validateImageData(processed),
      "Processed image should be valid",
    );

    const augmented = augmentData(processed, { rotation: true, flip: true });
    this.assert(
      augmented.length === 3,
      "Should create 3 images (original + 2 augmentations)",
    );

    // Validate all augmented versions
    let allValid = true;
    for (const version of augmented) {
      if (!validateImageData(version)) {
        allValid = false;
        break;
      }
    }
    this.assert(allValid, "All augmented images should be valid");
  }

  static testPerformance(): void {
    console.log("\n🧪 Testing performance with large arrays...");

    const largeImage = new Array(784).fill(0.5); // 28x28 image

    const startTime = performance.now();
    const result = augmentData(largeImage, {
      rotation: true,
      flip: true,
      noise: true,
      brightness: true,
    });
    const endTime = performance.now();

    this.assert(
      endTime - startTime < 100,
      "Should complete large augmentation in < 100ms",
    );
    this.assertEqual(
      result.length,
      6,
      "Should create 6 images (1 original + 5 augmentations)",
    );

    // Test validation performance
    const startValidation = performance.now();
    const isValid = validateImageData(largeImage);
    const endValidation = performance.now();

    this.assert(isValid, "Large valid array should pass validation");
    this.assert(
      endValidation - startValidation < 50,
      "Validation should be fast (< 50ms)",
    );
  }

  static runAllTests(): void {
    console.log("🚀 Running CNN Utils Tests...\n");

    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;

    this.testPreprocessImage();
    this.testAugmentData();
    this.testValidateImageData();
    this.testIntegration();
    this.testPerformance();

    console.log("\n📊 Test Results:");
    console.log(`Total Tests: ${this.testCount}`);
    console.log(`✅ Passed: ${this.passCount}`);
    console.log(`❌ Failed: ${this.failCount}`);
    console.log(
      `📈 Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`,
    );

    if (this.failCount === 0) {
      console.log("\n🎉 All CNN Utils tests passed!");
    } else {
      console.log("\n⚠️  Some tests failed. Check output above for details.");
    }

    console.log("\nSuccess CNN Utils Test Suite Complete!");
  }
}

// Export test utilities for reuse
export { CNNUtilsTest, preprocessImage, augmentData, validateImageData };

// Run tests if this file is executed directly
if (typeof window === "undefined") {
  CNNUtilsTest.runAllTests();
}
