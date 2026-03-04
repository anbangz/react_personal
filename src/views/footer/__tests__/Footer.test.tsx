import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

describe('Footer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows only "2020" when current year is 2020', () => {
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2020);
    render(<Footer />);
    expect(screen.getByText(/2020 Anbang Zhang/)).toBeInTheDocument();
    expect(screen.queryByText(/2020–/)).not.toBeInTheDocument();
  });

  it('shows "2020–<year>" when current year is after 2020', () => {
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    render(<Footer />);
    expect(screen.getByText(/2020–2026 Anbang Zhang/)).toBeInTheDocument();
  });

  it('shows range for any year after 2020', () => {
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2021);
    render(<Footer />);
    expect(screen.getByText(/2020–2021/)).toBeInTheDocument();
  });

  it('renders the GitHub repo link', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'GitHub repo' });
    expect(link).toHaveAttribute('href', 'https://github.com/anbangz/react_personal');
  });
});
