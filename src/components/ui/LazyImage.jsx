import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

export default function LazyImage({ 
    src, 
    alt, 
    className, 
    imageClassName,
    objectFit = "cover",
    fallbackSrc,
    transparentBackground = false,
    ...props 
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (src) {
            const img = new Image();
            img.src = src;
            img.onload = () => setLoaded(true);
            img.onerror = () => setError(true);
        }
    }, [src]);

    const bgClass = transparentBackground ? "" : "bg-gray-100 dark:bg-gray-800";
    const placeholderBgClass = transparentBackground ? "bg-transparent" : "bg-gray-200 dark:bg-gray-700";

    return (
        <div className={cn("relative overflow-hidden", bgClass, className)}>
            {!loaded && !error && (
                <div className={cn("absolute inset-0 flex items-center justify-center animate-pulse", placeholderBgClass)}>
                    <ImageIcon className="w-1/4 h-1/4 text-gray-400 opacity-20" />
                </div>
            )}
            
            {(error && fallbackSrc) ? (
                <img 
                    src={fallbackSrc} 
                    alt={alt} 
                    className={cn("w-full h-full", `object-${objectFit}`, imageClassName)} 
                />
            ) : (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                    className={cn(
                        "w-full h-full transition-opacity duration-500 ease-in-out",
                        `object-${objectFit}`,
                        loaded ? "opacity-100" : "opacity-0",
                        imageClassName
                    )}
                    {...props}
                />
            )}
        </div>
    );
}