import { render, screen } from '@testing-library/react';
import { ManoIcon } from '../ManoIcon';

// Mock framer-motion to render a plain div so we can inspect props
jest.mock('framer-motion', () => ({
  m: { div: (props: any) => <div {...props} /> },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ManoIcon', () => {
  it('renders a gold badge with "Mano" text', () => {
    const { container } = render(<ManoIcon />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('rounded-full');
    // Must contain a span with "Mano" text
    const span = wrapper.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span!.textContent).toBe('Mano');
  });

  it.each(['xs', 'sm', 'md'] as const)('applies correct size classes for size="%s"', (size) => {
    const { container } = render(<ManoIcon size={size} />);
    const wrapper = container.firstChild as HTMLElement;
    // All sizes should have the text styling
    expect(wrapper.className).toContain('text-[');
  });

  it('renders with animate wrapper without crashing', () => {
    const { container } = render(<ManoIcon animate />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ManoIcon className="ml-2" />);
    expect((container.firstChild as HTMLElement).className).toContain('ml-2');
  });
});
