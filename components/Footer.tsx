import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center space-y-4">
          {/* Copyright */}
          <div className="text-gray-300">
            <p className="font-semibold text-lg">
              © 2024 Hopping Mad Games, LLC. All Rights Reserved.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 max-w-4xl mx-auto">
            <h3 className="text-red-300 font-bold text-lg mb-2">
              ⚠️ IMPORTANT DISCLAIMER
            </h3>
            <div className="text-red-200 text-sm space-y-2">
              <p className="font-semibold">
                This is a proprietary demonstration project for portfolio purposes only.
              </p>
              <p>
                <strong>NOT FREE SOFTWARE:</strong> This code is NOT offered under any open-source license.
                All code, concepts, implementations, and intellectual property contained herein remain
                the exclusive property of Hopping Mad Games, LLC.
              </p>
              <p>
                <strong>NO COMMERCIAL USE:</strong> Any commercial use, modification, distribution,
                or derivative work based on this code is strictly prohibited without explicit written
                permission from Hopping Mad Games, LLC.
              </p>
              <p>
                <strong>DEMO ONLY:</strong> This application is provided solely to demonstrate
                technical capabilities and implementation approaches. It is not intended for
                production use or commercial deployment.
              </p>
            </div>
          </div>

          {/* Technical Info */}
          <div className="text-gray-400 text-sm border-t border-gray-700 pt-4">
            <p>
              Interactive CNN Trainer with TensorFlow.js • WebGPU Acceleration •
              Real-time Visualization • Web Worker Background Training
            </p>
            <p className="mt-1">
              Demonstration of advanced browser-based machine learning capabilities
            </p>
          </div>

          {/* Contact */}
          <div className="text-gray-500 text-xs">
            <p>
              For licensing inquiries or commercial use permissions, contact Hopping Mad Games, LLC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
