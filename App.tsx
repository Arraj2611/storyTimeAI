import React, { useState, useCallback } from 'react';
import { StoryPage } from './types';
import { generateStory, generateStoryIdea } from './services/geminiService';
import StoryViewer from './components/StoryViewer';
import ChatBot from './components/ChatBot';
import { SparklesIcon, BookOpenIcon } from './components/icons/Icons';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [prompt, setPrompt] = useState<string>('A curious squirrel who finds a magical glowing acorn');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIdeaLoading, setIsIdeaLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStory = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a story idea!');
      return;
    }
    setIsLoading(true);
    setError(null);
    setStoryPages([]);

    try {
      const pages = await generateStory(prompt);
      setStoryPages(pages.map(p => ({ ...p, imageUrl: undefined })));
    } catch (err) {
      console.error(err);
      setError('Oops! Something went wrong while creating the story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);
  
  const handleGenerateIdea = useCallback(async () => {
    setIsIdeaLoading(true);
    setError(null);
    try {
      const idea = await generateStoryIdea();
      setPrompt(idea);
    } catch (err) {
      console.error(err);
      setError("Oops! I ran out of ideas. Please try again in a moment.");
    } finally {
      setIsIdeaLoading(false);
    }
  }, []);

  const handleNewStory = () => {
    setStoryPages([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-200 to-red-200 text-gray-800 antialiased">
      <header className="p-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-purple-700 drop-shadow-lg flex items-center justify-center gap-3">
          <BookOpenIcon className="w-10 h-10" />
          StoryTime AI
        </h1>
        <p className="text-purple-600 mt-1">Your magical adventure awaits!</p>
      </header>
      
      <main className="container mx-auto p-4">
        {storyPages.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">What should the story be about?</h2>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A brave knight and a friendly dragon"
                className="w-full p-4 pr-16 bg-purple-50 text-gray-800 placeholder-gray-500 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-400 focus:border-purple-500 transition duration-300 resize-none"
                rows={3}
                disabled={isLoading || isIdeaLoading}
              />
              <button
                onClick={handleGenerateIdea}
                disabled={isLoading || isIdeaLoading}
                className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded-full hover:bg-purple-100"
                aria-label="Inspire me with a story idea"
              >
                {isIdeaLoading ? (
                  <LoadingSpinner className="w-6 h-6" />
                ) : (
                  <SparklesIcon className="w-6 h-6" />
                )}
              </button>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <div className="mt-4">
                <button
                  onClick={handleGenerateStory}
                  disabled={isLoading || isIdeaLoading}
                  className="w-full flex items-center justify-center gap-3 bg-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-purple-700 active:scale-95 transform transition-all duration-200 disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner className="-ml-1 mr-3 h-5 w-5" />
                      Creating Magic...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-6 h-6" />
                      Generate My Story!
                    </>
                  )}
                </button>
            </div>
          </div>
        ) : (
          <StoryViewer pages={storyPages} onNewStory={handleNewStory} />
        )}
      </main>
      <ChatBot />
    </div>
  );
};

export default App;
