import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaLightboxProps {
    url: string;
    onClose: () => void;
    title?: string;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({ url, onClose, title }) => {
    // Prevent scrolling when lightbox is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Handle escape key to close
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-[110]"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                <X className="h-6 w-6" />
            </Button>

            {/* Image Container */}
            <div
                className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={url}
                    alt={title || "Full view"}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                />
                {title && (
                    <p className="mt-4 text-white text-lg font-medium tracking-wide drop-shadow-md">
                        {title}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MediaLightbox;
