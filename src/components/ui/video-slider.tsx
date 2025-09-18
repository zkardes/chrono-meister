import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import './video-slider.css';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  icon?: React.ReactNode;
  paginationIcon?: React.ReactNode;
}

interface VideoSliderProps {
  data: VideoItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showPagination?: boolean;
  showNavigation?: boolean;
  className?: string;
}

const VideoSlider: React.FC<VideoSliderProps> = ({
  data,
  autoplay = false,
  autoplayInterval = 5000,
  showPagination = true,
  showNavigation = false, // Changed default to false
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const dotsWrapperRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<HTMLVideoElement[]>([]);

  // Handle slide change
  const goToSlide = (index: number) => {
    // Pause current video
    if (videoRefs.current[currentIndex]) {
      videoRefs.current[currentIndex].pause();
    }
    
    // Ensure index is within bounds
    if (index >= 0 && index < data.length) {
      setCurrentIndex(index);
    }
  };

  // Go to next slide
  const goToNext = () => {
    // Pause current video
    if (videoRefs.current[currentIndex]) {
      videoRefs.current[currentIndex].pause();
    }
    
    if (data.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
  };

  // Go to previous slide
  const goToPrev = () => {
    // Pause current video
    if (videoRefs.current[currentIndex]) {
      videoRefs.current[currentIndex].pause();
    }
    
    if (data.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + data.length) % data.length);
  };

  // Update pagination position to center active item
  useEffect(() => {
    if (dotsContainerRef.current && dotsWrapperRef.current && data.length > 0) {
      const itemWidth = 50; // Approximate width of each pagination item including margin
      const containerWidth = dotsWrapperRef.current.offsetWidth || 0;
      
      // Calculate the offset needed to center the active item
      const activeItemPosition = currentIndex * itemWidth;
      const centerPosition = containerWidth / 2;
      const translateX = centerPosition - activeItemPosition - itemWidth / 2;
      
      // Apply the transformation
      dotsContainerRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [currentIndex, data.length]);

  // Handle autoplay
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start autoplay if enabled and not paused
    if (autoplay && !isPaused && data.length > 1) {
      intervalRef.current = setInterval(() => {
        goToNext();
      }, autoplayInterval);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoplay, isPaused, autoplayInterval, data.length]);

  // Handle edge case where data is empty
  if (data.length === 0) {
    return (
      <div className={`video-slider-container ${className}`}>
        <div className="video-slider-list">
          <div className="video-slider-track">
            <div className="video-slider-slide" style={{ flex: '0 0 100%', minWidth: '100%' }}>
              <div className="video-slide-content">
                <p className="video-slide-description">No videos available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`video-slider-container ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      ref={sliderRef}
    >
      {showPagination && data.length > 1 && (
        <div className="video-slider-dots" ref={dotsWrapperRef}>
          <div 
            className="video-slider-dots-container"
            ref={dotsContainerRef}
            style={{ display: 'flex', transition: 'transform 0.3s ease' }}
          >
            {data.map((video, index) => (
              <li 
                key={video.id || index} 
                className={currentIndex === index ? 'video-slider-active' : ''}
              >
                <button 
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to video ${index + 1}`}
                  className="video-pagination-icon-button"
                >
                  {video.paginationIcon ? (
                    <div className="video-pagination-icon">
                      {video.paginationIcon}
                    </div>
                  ) : video.icon ? (
                    <div className="video-pagination-icon">
                      {video.icon}
                    </div>
                  ) : (
                    <div className="video-pagination-icon">
                      <Play className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </div>
        </div>
      )}
      
      <div className="video-slider-list">
        <div 
          className="video-slider-track" 
          style={{ 
            display: 'flex',
            transition: 'transform 0.5s ease-in-out',
            transform: `translateX(-${currentIndex * 100}%)`
          }}
        >
          {data.map((video, index) => (
            <div 
              key={video.id || index} 
              className="video-slider-slide"
              style={{ 
                flex: '0 0 100%',
                minWidth: '100%'
              }}
            >
              <div className="video-slide-content">
                <div className="video-container">
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current[index] = el;
                    }}
                    src={video.videoUrl}
                    controls
                    className="video-element"
                    playsInline
                    onPlay={() => {
                      // Pause other videos when one starts playing
                      videoRefs.current.forEach((videoEl, i) => {
                        if (i !== index && videoEl) {
                          videoEl.pause();
                        }
                      });
                    }}
                  />
                </div>
                <h3 className="video-slide-title">{video.title}</h3>
                <p className="video-slide-description">{video.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Removed navigation arrows */}
    </div>
  );
};

export default VideoSlider;