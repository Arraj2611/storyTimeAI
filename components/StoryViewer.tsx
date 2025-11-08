import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StoryPage } from '../types';
import { generateImage, generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';
import LoadingSpinner from './LoadingSpinner';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon, SparklesIcon, XCircleIcon } from './icons/Icons';

interface StoryViewerProps {
  pages: StoryPage[];
  onNewStory: () => void;
}

interface StoryPageState extends StoryPage {
  imageUrl?: string;
  audioData?: string;
  audioBuffer?: AudioBuffer;
  isImageLoading: boolean;
  isAudioLoading: boolean;
  imageError: boolean;
  audioError: boolean;
}

type PlaybackStatus = 'playing' | 'paused' | 'stopped';

const StoryViewer: React.FC<StoryViewerProps> = ({ pages, onNewStory }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [storyPages, setStoryPages] = useState<StoryPageState[]>(() =>
    pages.map(p => ({
      ...p,
      isImageLoading: false,
      isAudioLoading: false,
      imageError: false,
      audioError: false,
    }))
  );
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [shouldAutoplay, setShouldAutoplay] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentPage = storyPages[currentPageIndex];

  const updatePage = useCallback((index: number, updates: Partial<StoryPageState>) => {
    setStoryPages(prev => {
      const newPages = [...prev];
      newPages[index] = { ...newPages[index], ...updates };
      return newPages;
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        console.warn("Audio could not be stopped, it might have already finished.", e);
      }
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioSourceRef.current = null;
    audioContextRef.current = null;
    setPlaybackStatus('stopped');
  }, []);

  const playAudioForCurrentPage = useCallback(async () => {
    if (!currentPage.audioBuffer) return;

    stopAudio();

    const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const source = context.createBufferSource();
    source.buffer = currentPage.audioBuffer;
    source.connect(context.destination);

    source.onended = () => {
      if (audioContextRef.current?.state !== 'suspended') {
        stopAudio();
      }
    };

    source.start();
    audioContextRef.current = context;
    audioSourceRef.current = source;
    setPlaybackStatus('playing');
  }, [currentPage.audioBuffer, stopAudio]);

  useEffect(() => {
    const prefetchAssets = async () => {
      for (let i = 0; i < pages.length; i++) {
        // Fetch image
        if (pages[i].imagePrompt && !storyPages[i].imageUrl) {
          updatePage(i, { isImageLoading: true });
          try {
            const imageUrl = await generateImage(pages[i].imagePrompt);
            updatePage(i, { imageUrl, isImageLoading: false });
          } catch (e) {
            console.error(`Failed to generate image for page ${i}`, e);
            updatePage(i, { isImageLoading: false, imageError: true });
          }
        }

        // Fetch and decode audio
        if (pages[i].text && !storyPages[i].audioBuffer) {
          updatePage(i, { isAudioLoading: true });
          try {
            const audioData = await generateSpeech(pages[i].text);
            const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const decodedBytes = decode(audioData);
            const audioBuffer = await decodeAudioData(decodedBytes, tempAudioContext, 24000, 1);
            await tempAudioContext.close();
            updatePage(i, { audioData, audioBuffer, isAudioLoading: false });
          } catch (e) {
            console.error(`Failed to generate audio for page ${i}`, e);
            updatePage(i, { isAudioLoading: false, audioError: true });
          }
        }
      }
    };

    prefetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  useEffect(() => {
    if (shouldAutoplay) {
      const pageToPlay = storyPages[currentPageIndex];
      if (pageToPlay.audioBuffer) {
        playAudioForCurrentPage();
        setShouldAutoplay(false); // Consume the autoplay intent
      }
    }
  }, [shouldAutoplay, currentPageIndex, storyPages[currentPageIndex]?.audioBuffer, playAudioForCurrentPage]);


  const handlePlayPauseToggle = async () => {
    setShouldAutoplay(false); // Manual control overrides autoplay
    if (playbackStatus === 'playing') {
      if (audioContextRef.current?.state === 'running') {
        await audioContextRef.current.suspend();
        setPlaybackStatus('paused');
      }
    } else if (playbackStatus === 'paused') {
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
        setPlaybackStatus('playing');
      }
    } else { // 'stopped'
      await playAudioForCurrentPage();
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < storyPages.length - 1) {
      stopAudio();
      setCurrentPageIndex(prev => prev + 1);
      setShouldAutoplay(true);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      stopAudio();
      setCurrentPageIndex(prev => prev - 1);
      setShouldAutoplay(false); // Explicitly disable autoplay when going back
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const isPlayButtonDisabled = currentPage.isAudioLoading || !!currentPage.audioError || !currentPage.audioBuffer;

  return (
    <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 flex flex-col items-center">
      <div className="w-full mb-4">
        <button
          onClick={onNewStory}
          className="flex items-center gap-2 bg-pink-500 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:bg-pink-600 active:scale-95 transform transition-all duration-200"
        >
          <SparklesIcon className="w-5 h-5" />
          Start a New Story
        </button>
      </div>
      <div className="w-full aspect-square bg-gray-200 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center shadow-inner">
        {currentPage.isImageLoading && (
          <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white z-10">
            <LoadingSpinner className="w-10 h-10" />
            <p className="mt-2 font-semibold">Drawing a picture...</p>
          </div>
        )}
        {currentPage.imageError && !currentPage.isImageLoading && (
          <div className="p-4 text-center text-red-500 font-semibold">
            <XCircleIcon className="w-12 h-12 mx-auto mb-2 text-red-400" />
            I couldn't draw the picture for this page.
          </div>
        )}
        {currentPage.imageUrl && (
          <img src={currentPage.imageUrl} alt={currentPage.imagePrompt} className="w-full h-full object-cover" />
        )}
      </div>

      <div className="text-center w-full">
        <p className="text-lg md:text-xl text-gray-700 mb-4 h-24 md:h-16 flex items-center justify-center p-2">{currentPage.text}</p>
        <div className="flex items-center justify-between w-full">
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
            className="p-3 rounded-full bg-purple-500 text-white disabled:bg-gray-300 shadow-md hover:bg-purple-600 active:scale-90 transition-transform"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPauseToggle}
              disabled={isPlayButtonDisabled}
              className="p-4 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 active:scale-90 transition-transform disabled:bg-green-300 flex items-center justify-center w-[60px] h-[60px]"
            >
              {currentPage.isAudioLoading ? (
                <LoadingSpinner className="w-7 h-7" />
              ) : playbackStatus === 'playing' ? (
                <PauseIcon className="w-7 h-7" />
              ) : (
                <PlayIcon className="w-7 h-7" />
              )}
            </button>
            <span className="font-bold text-gray-600">{currentPageIndex + 1} / {storyPages.length}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPageIndex === storyPages.length - 1}
            className="p-3 rounded-full bg-purple-500 text-white disabled:bg-gray-300 shadow-md hover:bg-purple-600 active:scale-90 transition-transform"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;