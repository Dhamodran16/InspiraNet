import React from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const AsyncButton: React.FC<AsyncButtonProps> = ({
  loading = false,
  children,
  loadingText,
  className,
  disabled,
  variant = 'default',
  size = 'default',
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
};

export default AsyncButton;
