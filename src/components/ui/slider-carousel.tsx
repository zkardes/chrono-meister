import React, { useState, useRef, useEffect } from 'react';
import './slider-carousel.css';

interface SlideItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  paginationIcon?: string;
}

interface SliderCarouselProps {
  data: SlideItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showPagination?: boolean;
  showNavigation?: boolean;
}

const SliderCarousel: React.FC<SliderCarouselProps> = ({
  data,
  autoplay = false,
  autoplayInterval = 3000,
  showPagination = true,
  showNavigation = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const paginationContainerRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Clear autoplay interval on unmount
  useEffect(() => {
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, []);

  // Update pagination position to center active item
  useEffect(() => {
    if (paginationRef.current && paginationContainerRef.current && data.length > 0) {
      const itemWidth = 50; // Approximate width of each pagination item including margin
      const containerWidth = paginationContainerRef.current.offsetWidth || 0;
      
      // Calculate the offset needed to center the active item
      const activeItemPosition = currentIndex * itemWidth;
      const centerPosition = containerWidth / 2;
      const translateX = centerPosition - activeItemPosition - itemWidth / 2;
      
      // Apply the transformation
      paginationRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [currentIndex, data.length]);

  // Scroll to next slide
  const scrollToNext = () => {
    if (data.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % data.length;
    setCurrentIndex(nextIndex);
  };

  // Scroll to previous slide
  const scrollToPrevious = () => {
    if (data.length === 0) return;
    
    const prevIndex = (currentIndex - 1 + data.length) % data.length;
    setCurrentIndex(prevIndex);
  };

  // Start autoplay
  const startAutoplay = () => {
    if (autoplay && data.length > 1) {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      
      autoplayRef.current = setInterval(() => {
        scrollToNext();
      }, autoplayInterval);
    }
  };

  // Stop autoplay
  const stopAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  // Initialize autoplay
  useEffect(() => {
    if (autoplay && data.length > 1) {
      startAutoplay();
    }
    
    return () => {
      stopAutoplay();
    };
  }, [autoplay, autoplayInterval, data.length]);

  // Reset autoplay when currentIndex changes
  useEffect(() => {
    if (autoplay && data.length > 1) {
      stopAutoplay();
      startAutoplay();
    }
  }, [currentIndex, autoplay, data.length]);

  // Handle edge case where data is empty
  if (data.length === 0) {
    return (
      <div className="slider-container">
        <div className="slide empty-slide">
          <p className="empty-text">No slides available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slider-container" ref={containerRef}>
      {showPagination && data.length > 1 && (
        <div className="pagination-container" ref={paginationContainerRef}>
          <div 
            className="pagination-container-wrapper"
            ref={paginationRef}
            style={{ display: 'flex', transition: 'transform 0.3s ease' }}
          >
            {data.map((item, index) => (
              <button
                key={item.id || index}
                className={`pagination-icon-container ${
                  currentIndex === index ? 'pagination-icon-active' : ''
                }`}
                onClick={() => {
                  setCurrentIndex(index);
                  // Pause autoplay when user interacts
                  if (autoplay) {
                    stopAutoplay();
                    setTimeout(() => {
                      startAutoplay();
                    }, autoplayInterval);
                  }
                }}
                aria-label={`Go to slide ${index + 1}`}
              >
                <span className={`pagination-icon ${
                  currentIndex === index ? 'pagination-icon-active-text' : ''
                }`}>
                  {item.paginationIcon || item.icon || '•'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div 
        className="slider-track"
        style={{ 
          display: 'flex',
          transition: 'transform 0.5s ease-in-out',
          transform: `translateX(-${currentIndex * 100}%)`
        }}
      >
        {data.map((item, index) => (
          <div 
            key={item.id || index} 
            className="slide"
            style={{ 
              flex: '0 0 100%',
              minWidth: '100%'
            }}
          >
            <div className="slide-content">
              {item.icon && (
                <div className="icon-container">
                  <span className="icon">{item.icon}</span>
                </div>
              )}
              <h3 className="title">{item.title}</h3>
              <p className="description">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {showNavigation && data.length > 1 && (
        <>
          <button
            className="nav-button nav-button-left"
            onClick={scrollToPrevious}
            aria-label="Previous slide"
          >
            <span className="nav-button-text">‹</span>
          </button>
          
          <button
            className="nav-button nav-button-right"
            onClick={scrollToNext}
            aria-label="Next slide"
          >
            <span className="nav-button-text">›</span>
          </button>
        </>
      )}
    </div>
  );
};

export default SliderCarousel;