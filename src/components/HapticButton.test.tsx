import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { HapticButton } from './HapticButton';

test('renders children correctly', () => {
  render(<HapticButton>Click Me</HapticButton>);
  expect(screen.getByText('Click Me')).toBeInTheDocument();
});

test('handles clicks', () => {
  const handleClick = vi.fn();
  render(<HapticButton onClick={handleClick}>Click Me</HapticButton>);
  fireEvent.click(screen.getByText('Click Me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
