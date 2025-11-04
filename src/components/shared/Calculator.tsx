"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CalculatorProps {
  onValueChange: (value: number) => void;
  onClose: () => void;
}

export function Calculator({ onValueChange, onClose }: CalculatorProps) {
  const [input, setInput] = useState('');

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setInput('');
    } else if (value === '=') {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(input.replace('x', '*').replace(',', '.'));
        onValueChange(parseFloat(result.toFixed(2)));
        onClose();
      } catch (error) {
        setInput('Erro');
      }
    } else {
      setInput(input + value);
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    'C', '0', '.', '+',
    '=',
  ];

  return (
    <div className="p-2 bg-card rounded-lg shadow-lg">
      <Input
        type="text"
        readOnly
        value={input}
        className="mb-2 text-right text-lg font-mono bg-muted"
        placeholder="0"
      />
      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn) => (
          <Button
            key={btn}
            onClick={() => handleButtonClick(btn)}
            variant={['C', '=', '/', '*', '-', '+'].includes(btn) ? 'secondary' : 'outline'}
            className={`text-lg font-bold ${btn === '=' ? 'col-span-4' : ''}`}
          >
            {btn}
          </Button>
        ))}
      </div>
    </div>
  );
}
