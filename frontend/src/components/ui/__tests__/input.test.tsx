import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../input';

describe('Input component', () => {
  it('renders input with label and helper text', () => {
    render(<Input label="Cluster Name" helperText="Enter the name of the Kong instance" />);
    expect(screen.getByLabelText('Cluster Name')).toBeInTheDocument();
    expect(screen.getByText('Enter the name of the Kong instance')).toBeInTheDocument();
  });

  it('displays error message when error prop is passed', () => {
    render(<Input label="Kong URL" error="Invalid URL format" />);
    expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    expect(screen.getByLabelText('Kong URL')).toHaveClass('border-red-500');
  });

  it('handles typing and onChange events', () => {
    const handleChange = vi.fn();
    render(<Input label="API Key" onChange={handleChange} />);
    const input = screen.getByLabelText('API Key');
    fireEvent.change(input, { target: { value: 'secret-123' } });
    expect(handleChange).toHaveBeenCalled();
  });
});
