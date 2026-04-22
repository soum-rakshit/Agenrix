import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function TagInput({ value = [], onChange, placeholder, className }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={cn(
      "flex flex-wrap gap-2 p-2 bg-background border border-border rounded-md focus-within:ring-2 focus-within:ring-primary/50 transition-shadow",
      className
    )}>
      {value.map((tag, index) => (
        <span 
          key={index} 
          className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/40"
      />
    </div>
  );
}
