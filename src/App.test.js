import { render, screen } from '@testing-library/react';
import App from './App';

test('renders boligeffekt app', () => {
  render(<App />);
  const headingElement = screen.getByText(/Hva er energimerket/i);
  expect(headingElement).toBeInTheDocument();
});
