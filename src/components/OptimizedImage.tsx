'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Box, Skeleton } from '@mui/material';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 150,
  height = 150,
  className,
  style,
  fill = false,
  priority = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Box 
      sx={{ 
        width: fill ? '100%' : width, 
        height: fill ? '100%' : height, 
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1,
        backgroundColor: 'grey.100',
        ...style
      }}
      className={className}
    >
      {isLoading && !hasError && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%"
          sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />
      )}
      
      {hasError ? (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.200',
            color: 'grey.500',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}
        >
          No Image
        </Box>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.3s ease',
            opacity: isLoading ? 0 : 1,
          }}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          sizes={fill ? '100vw' : `${width}px`}
        />
      )}
    </Box>
  );
};

export default OptimizedImage;