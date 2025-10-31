import { useState } from 'react';
import clsx from 'clsx';

type VariationCardProps = {
  text: string;
  initialFavorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
};

export function VariationCard({ text, initialFavorite = false, onFavoriteChange }: VariationCardProps) {
  const [editableText, setEditableText] = useState(text);
  const [favorite, setFavorite] = useState(initialFavorite);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableText);
  };

  const toggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    onFavoriteChange?.(next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/70 p-4 shadow-sm">
      <textarea
        className="min-h-[140px] resize-y rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        value={editableText}
        onChange={(event) => setEditableText(event.target.value)}
      />
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-slate-800 px-3 py-1 font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Copy
          </button>
          <span className="text-slate-500">{editableText.length} chars</span>
        </div>
        <button
          type="button"
          onClick={toggleFavorite}
          className={clsx(
            'rounded-md px-3 py-1 font-medium transition',
            favorite
              ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700',
          )}
        >
          {favorite ? 'Favorited ★' : 'Favorite ☆'}
        </button>
      </div>
    </div>
  );
}
