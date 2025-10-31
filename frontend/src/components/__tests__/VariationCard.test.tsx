import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VariationCard } from '../VariationCard';

describe('VariationCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('allows editing and copying text', async () => {
    render(<VariationCard text="Hello world" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    fireEvent.click(screen.getByText('Copy'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Updated text');
  });

  it('toggles favorite state', () => {
    const handler = vi.fn();
    render(<VariationCard text="Hello" initialFavorite={false} onFavoriteChange={handler} />);

    const [button] = screen.getAllByRole('button', { name: /favorite/i });
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledWith(true);
    fireEvent.click(button);
    expect(handler).toHaveBeenCalledWith(false);
  });
});
