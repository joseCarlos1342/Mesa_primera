import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionControls } from '../ActionControls';

describe('ActionControls', () => {
  const mockRoom = {
    send: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LOBBY Phase', () => {
    it('Should return null or empty when it is not my turn', () => {
      const { container } = render(
        <ActionControls 
          room={mockRoom} 
          phase="LOBBY" 
          isMyTurn={false} 
          playerChips={100} 
        />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('PIQUE & GUERRA Phases', () => {
    it('Should not render action buttons if it is NOT my turn', () => {
      const { container } = render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={false} 
          playerChips={100} 
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('Should render PASO button and chips if it IS my turn', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={true} 
          playerChips={5000} 
        />
      );
      
      expect(screen.getByText('Paso')).toBeInTheDocument();
      expect(screen.getByText('Toca una ficha para apostar')).toBeInTheDocument();
      expect(screen.getByText('1k')).toBeInTheDocument();
      expect(screen.getByText('2k')).toBeInTheDocument();
    });

    it('Should call room.send("action", { action: "paso", amount: undefined, droppedCards: undefined }) when PASO is clicked', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={true} 
          playerChips={100} 
        />
      );

      const pasoButton = screen.getByText('Paso').closest('button');
      fireEvent.click(pasoButton!);

      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'paso', amount: undefined, droppedCards: undefined });
      expect(window.navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('Should show VOY after selecting a chip and send correct payload', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          playerChips={5000} 
        />
      );

      // Select 1k chip
      const chip1k = screen.getByText('1k').closest('button');
      fireEvent.click(chip1k!);

      // VOY button should appear
      const voyButton = screen.getAllByText('Voy')[0].closest('button'); // framer motion can cause multiple elements to be briefly present
      expect(voyButton).toBeInTheDocument();

      fireEvent.click(voyButton!);
      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'bet', amount: 1000, droppedCards: undefined });
    });

    it('Should allow calling VOY without selecting chips during GUERRA', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          playerChips={5000} 
        />
      );

      const voyButton = screen.getAllByText('Voy')[0].closest('button');
      fireEvent.click(voyButton!);
      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'call', amount: undefined, droppedCards: undefined });
    });
  });

  describe('DESCARTE Phase', () => {
    it('Should render the instructions and dynamic discard button if it is my turn', () => {
      const selectedCards = ['01-Oros', '02-Copas'];
      
      render(
        <ActionControls 
          room={mockRoom} 
          phase="DESCARTE" 
          isMyTurn={true} 
          playerChips={100}
          selectedCards={selectedCards} 
        />
      );
      
      expect(screen.getByText(/Fichas a botar/i)).toBeInTheDocument();
      expect(screen.getByText(/Botar 2 y Pedir/i)).toBeInTheDocument();
    });

    it('Should send discard action and request selection clearance', () => {
      const onClearSelection = vi.fn();
      
      render(
        <ActionControls 
          room={mockRoom} 
          phase="DESCARTE" 
          isMyTurn={true} 
          playerChips={100}
          selectedCards={['01-Oros']}
          onClearSelection={onClearSelection}
        />
      );
      
      const discardBtn = screen.getByText(/Botar 1 y Pedir/i).closest('button');
      fireEvent.click(discardBtn!);

      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'discard', amount: undefined, droppedCards: ['01-Oros'] });
      expect(onClearSelection).toHaveBeenCalled();
    });
  });
});
