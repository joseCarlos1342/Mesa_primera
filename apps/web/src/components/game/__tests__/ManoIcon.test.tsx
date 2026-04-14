import { render, screen } from '@testing-library/react';
import { ManoIcon } from '../ManoIcon';

// Mock framer-motion to render a plain div so we can inspect props
jest.mock('framer-motion', () => ({
  m: { div: (props: any) => <div {...props} /> },
  AnimatePresence: ({ children }: any) => children,
}));

describe('ManoIcon', () => {
  it('renders a circular badge with a hand icon (SVG with paths)', () => {
    const { container } = render(<ManoIcon />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('rounded-full');
    // Must contain an SVG (Lucide Hand renders as <svg>)
    const svg = wrapper.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Lucide Hand has multiple path elements
    const paths = svg!.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it.each(['xs', 'sm', 'md'] as const)('applies correct outer size for size="%s"', (size) => {
    const { container } = render(<ManoIcon size={size} />);
    const wrapper = container.firstChild as HTMLElement;
    const sizeMap = { xs: 'w-4', sm: 'w-5', md: 'w-7' };
    expect(wrapper.className).toContain(sizeMap[size]);
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
