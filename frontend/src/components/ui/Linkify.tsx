import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkifyProps {
    text: string;
    /** When true, show only the hostname as link text instead of the full URL */
    shortenUrls?: boolean;
}

// Matches http(s):// URLs and bare www. URLs
// Strips common trailing punctuation that isn't part of the URL
const URL_REGEX = /\b(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+\.[^\s<>"')\]]+)/gi;

function cleanUrl(raw: string): { href: string; display: string } {
    // Strip trailing punctuation characters that are likely not part of the URL
    const stripped = raw.replace(/[.,!?;:'")\]>]+$/, '');
    const href = /^https?:\/\//i.test(stripped) ? stripped : `https://${stripped}`;
    return { href, display: stripped };
}

function shortDisplay(url: string): string {
    try {
        const u = new URL(url);
        // Show host + pathname (truncated if too long)
        const path = u.pathname === '/' ? '' : u.pathname;
        const full = u.hostname + path;
        return full.length > 40 ? full.slice(0, 38) + '…' : full;
    } catch {
        return url.slice(0, 40) + (url.length > 40 ? '…' : '');
    }
}

const Linkify: React.FC<LinkifyProps> = ({ text, shortenUrls = false }) => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(URL_REGEX.source, 'gi');

    while ((match = regex.exec(text)) !== null) {
        // Push plain text before this match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const { href, display } = cleanUrl(match[0]);
        const label = shortenUrls ? shortDisplay(href) : display;

        parts.push(
            <a
                key={match.index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
                title={href}
            >
                {label}
                <ExternalLink className="h-3 w-3 flex-shrink-0 ml-0.5 opacity-70" />
            </a>
        );

        lastIndex = match.index + match[0].length;
    }

    // Push remaining plain text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return <>{parts}</>;
};

export default Linkify;
