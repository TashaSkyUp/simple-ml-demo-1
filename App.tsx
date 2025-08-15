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
import { DebugTestPanel } from "./components/DebugTestPanel";

const App: React.FC = () => (
  <div className="bg-gray-900 text-white min-h-screen font-sans">
    <header className="bg-gray-800 shadow-md p-2 dark-glass">
      <div className="ultra-wide-container mx-auto">
        <h1 className="text-2xl font-bold text-center text-cyan-400 hover:text-cyan-300 transition-colors">
          Interactive CNN with TensorFlow.js
        </h1>
        <p className="text-center text-gray-300 mt-1 text-sm hover:text-gray-200 transition-colors">
          Train neural networks in your browser
        </p>
      </div>
    </header>
    <main className="ultra-wide-container mx-auto py-2 md:py-3 lg:py-4 xl:py-5">
      <TrainableConvNet />
    </main>
    <Footer />
    <DebugTestPanel />
  </div>
);

export default App;
