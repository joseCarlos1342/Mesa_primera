import { render, screen, fireEvent } from '@testing-library/react';
import { ActionControls } from '../ActionControls';

describe('ActionControls', () => {
  const mockRoom = {
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LOBBY Phase', () => {
    it('Should return null or empty when it is not my turn', () => {
      const { container } = render(
        <ActionControls 
          room={mockRoom} 
          phase="LOBBY" 
          isMyTurn={false} 
        />
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('PIQUE Phase', () => {
    it('Should not render action buttons if it is NOT my turn', () => {
      const { container } = render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={false} 
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('Should render IR and Paso buttons if it IS my turn', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={true} 
          myChips={5000} 
        />
      );
      
      expect(screen.getByText('Paso')).toBeInTheDocument();
    });

    it('Should call room.send("action", { action: "paso" }) when PASO is clicked', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="PIQUE" 
          isMyTurn={true} 
          myChips={100} 
        />
      );

      const pasoButton = screen.getByText('Paso').closest('button');
      fireEvent.click(pasoButton!);

      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'paso' });
      expect(window.navigator.vibrate).toHaveBeenCalledWith(50);
    });
  });

  describe('Betting Phases (APUESTA_4_CARTAS / GUERRA / CANTICOS)', () => {
    it('Should render Paso (check) when no active bet and it IS my turn', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          myChips={5000}
          currentMaxBet={0}
          myRoundBet={0}
        />
      );

      expect(screen.getByText('Paso')).toBeInTheDocument();
    });

    it('Should render IR (call) button when there is an active bet', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          myChips={5000}
          currentMaxBet={2000}
          myRoundBet={0}
        />
      );

      expect(screen.getByText(/IR/)).toBeInTheDocument();
    });

    it('Should render Resto button when player cannot afford to call', () => {
      render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          myChips={500}
          currentMaxBet={2000}
          myRoundBet={0}
        />
      );

      expect(screen.getByText(/IR Resto/)).toBeInTheDocument();
    });

    it('Should return null when player is all-in', () => {
      const { container } = render(
        <ActionControls 
          room={mockRoom} 
          phase="GUERRA" 
          isMyTurn={true} 
          myChips={0}
          isAllIn={true}
        />
      );
      expect(container).toBeEmptyDOMElement();
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
          selectedCards={selectedCards} 
        />
      );
      
      expect(screen.getByText(/Botar 2/)).toBeInTheDocument();
    });

    it('Should send discard action and request selection clearance', () => {
      const onClearSelection = jest.fn();
      
      render(
        <ActionControls 
          room={mockRoom} 
          phase="DESCARTE" 
          isMyTurn={true} 
          selectedCards={['01-Oros']}
          onClearSelection={onClearSelection}
        />
      );
      
      const discardBtn = screen.getByText(/Botar 1/).closest('button');
      fireEvent.click(discardBtn!);

      expect(mockRoom.send).toHaveBeenCalledWith('action', { action: 'discard', droppedCards: ['01-Oros'] });
      expect(onClearSelection).toHaveBeenCalled();
    });
  });
});
