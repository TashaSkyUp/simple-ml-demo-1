/*
 * Interactive CNN Trainer with TensorFlow.js
 * © 2024 Hopping Mad Games, LLC. All Rights Reserved.
 *
 * PROPRIETARY SOFTWARE - NOT FOR COMMERCIAL USE
 * This code is proprietary and confidential. Unauthorized copying,
 * distribution, or use is strictly prohibited.
 */

import React from "react";
import { TrainableConvNet } from "./components/TrainableConvNet";
import { Footer } from "./components/Footer";

const App: React.FC = () => (
  <div className="bg-gray-900 text-white min-h-screen font-sans">
    <header className="bg-gray-800 shadow-md p-4 sticky top-0 z-50 dark-glass">
      <div className="ultra-wide-container max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-cyan-400 hover:text-cyan-300 transition-colors">
          Interactive CNN with TensorFlow.js
        </h1>
        <p className="text-center text-gray-300 mt-2 text-sm hover:text-gray-200 transition-colors">
          Train neural networks in your browser • Collapsible sections •
          Responsive design • Session persistence
        </p>
        <div className="hidden lg:flex justify-center mt-3 gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            GPU Accelerated
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Real-time Training
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            Session Management
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            Live Camera Pipeline
          </span>
        </div>
      </div>
    </header>
    <main className="ultra-wide-container max-w-7xl mx-auto p-4 md:p-6 lg:p-8 xl:p-10">
      <TrainableConvNet />
    </main>
    <Footer />
  </div>
);

export default App;
