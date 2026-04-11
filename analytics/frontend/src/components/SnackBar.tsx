import React, { useState, useEffect } from 'react';

interface SnackBarProps {
  message: string;
  show: boolean;
  onClose?: () => void;
}

const SnackBar: React.FC<SnackBarProps> = ({ message, show, onClose }) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Проверяем, был ли SnackBar закрыт ранее
    const dismissed = localStorage.getItem('snackbar_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsVisible(false);
    } else {
      setIsVisible(show);
    }
  }, [show]);

  const handleClose = (): void => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('snackbar_dismissed', 'true');
    if (onClose) {
      onClose();
    }
  };

  const handleCloseKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClose();
    }
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="w-full bg-blue-600 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-medium">{message}</p>
        </div>
        
        <button
          onClick={handleClose}
          onKeyDown={handleCloseKeyDown}
          className="ml-4 inline-flex items-center justify-center p-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white transition-colors duration-200"
          aria-label="Закрыть уведомление"
          tabIndex={0}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SnackBar;

