import React from 'react';
import { TrainableConvNet } from './components/TrainableConvNet';

const App: React.FC = () => (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="bg-gray-800 shadow-md p-4 sticky top-0 z-50">
        <h1 className="text-3xl font-bold text-center text-cyan-400">Interactive CNN with TensorFlow.js</h1>
      </header>
      <main className="p-2 md:p-8">
        <TrainableConvNet />
      </main>
    </div>
);

export default App;
