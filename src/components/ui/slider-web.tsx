import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './slider-web.css';

interface SlideItem {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface SliderWebProps {
  data: SlideItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showPagination?: boolean;
  showNavigation?: boolean;
  className?: string;
}

const SliderWeb: React.FC<SliderWebProps> = ({
  data,
  autoplay = false,
  autoplayInterval = 5000,
  showPagination = true,
  showNavigation = true,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const dotsWrapperRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle slide change
  const goToSlide = (index: number) => {
    // Ensure index is within bounds
    if (index >= 0 && index < data.length) {
      setCurrentIndex(index);
    }
  };

  // Go to next slide
  const goToNext = () => {
    if (data.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % data.length);
  };

  // Go to previous slide
  const goToPrev = () => {
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
      <div className={`product-features-tabs all-features-tabs slick-initialized slick-slider ${className}`}>
        <div className="slick-list">
          <div className="slick-track">
            <div className="slick-slide" style={{ flex: '0 0 100%', minWidth: '100%' }}>
              <div className="feature-slide">
                <div className="slide-content">
                  <p className="slide-description">No slides available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`product-features-tabs all-features-tabs slick-initialized slick-slider ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      ref={sliderRef}
    >
      {showPagination && data.length > 1 && (
        <div className="slick-dots" ref={dotsWrapperRef}>
          <div 
            className="slick-dots-container"
            ref={dotsContainerRef}
            style={{ display: 'flex', transition: 'transform 0.3s ease' }}
          >
            {data.map((slide, index) => (
              <li 
                key={slide.id || index} 
                className={currentIndex === index ? 'slick-active' : ''}
              >
                <button 
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className="pagination-icon-button"
                >
                  {slide.icon ? (
                    <div className="pagination-icon">
                      {slide.icon}
                    </div>
                  ) : (
                    <span className="pagination-dot" />
                  )}
                </button>
              </li>
            ))}
          </div>
        </div>
      )}
      
      <div className="slick-list">
        <div 
          className="slick-track" 
          style={{ 
            display: 'flex',
            transition: 'transform 0.5s ease-in-out',
            transform: `translateX(-${currentIndex * 100}%)`
          }}
        >
          {data.map((slide, index) => (
            <div 
              key={slide.id || index} 
              className="slick-slide"
              style={{ 
                flex: '0 0 100%',
                minWidth: '100%'
              }}
            >
              <div className="feature-slide">
                <div className="slide-content">
                  {slide.icon && (
                    <div className="feature-icon">
                      {slide.icon}
                    </div>
                  )}
                  <h3 className="slide-title">{slide.title}</h3>
                  <p className="slide-description">{slide.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNavigation && data.length > 1 && (
        <>
          <button 
            className="slick-prev slick-arrow" 
            onClick={goToPrev}
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            className="slick-next slick-arrow" 
            onClick={goToNext}
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
};

export default SliderWeb;