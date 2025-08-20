import React, { useState, useRef } from 'react';

interface TagInputProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Lightweight tags input that supports comma/Enter to add, backspace to remove, and paste with commas/new lines
export default function TagInput({ id, values, onChange, placeholder, className, disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commitToken = (raw: string) => {
    const token = raw.trim();
    if (!token) return;
    const next = Array.from(new Set([...(values || []), token]));
    onChange(next);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitToken(inputValue);
    } else if (e.key === 'Backspace' && inputValue.length === 0 && values.length > 0) {
      // Remove last tag on backspace when input is empty
      e.preventDefault();
      const next = values.slice(0, -1);
      onChange(next);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const text = e.clipboardData.getData('text');
    if (text && (text.includes(',') || text.includes('\n'))) {
      e.preventDefault();
      const tokens = text
        .split(/[,\n]/)
        .map(t => t.trim())
        .filter(Boolean);
      const next = Array.from(new Set([...(values || []), ...tokens]));
      onChange(next);
      setInputValue('');
    }
  };

  const removeTag = (idx: number) => {
    const next = values.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div
      className={`flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-2 text-base focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm ${className || ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {values && values.length > 0 && values.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/10"
            aria-label={`Remove ${tag}`}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(idx);
            }}
            disabled={disabled}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commitToken(inputValue)}
        onPaste={handlePaste}
        placeholder={values?.length ? '' : (placeholder || 'Type and press Enter')}
        disabled={disabled}
        className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}


