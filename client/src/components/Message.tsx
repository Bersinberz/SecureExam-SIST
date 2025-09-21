import React, { useEffect, useState, type JSX } from 'react';
import { FiCheckCircle, FiInfo, FiAlertCircle, FiX } from 'react-icons/fi';

interface MessageProps {
  text: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

const Message: React.FC<MessageProps> = ({ text, type, duration = 4000, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    if (!isHovered) {
      const interval = setInterval(() => {
        setProgress(prev => (prev > 0 ? prev - 100 / (duration / 50) : 0));
      }, 50);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onHide?.(), 500);
        clearInterval(interval);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [duration, onHide, isHovered]);

  const colors: Record<string, { bg: string; gradient: string; border: string; iconBg: string }> = {
    success: {
      bg: '#28a745',
      gradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      border: 'rgba(40, 167, 69, 0.3)',
      iconBg: 'rgba(255, 255, 255, 0.25)'
    },
    error: {
      bg: '#dc3545',
      gradient: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
      border: 'rgba(220, 53, 69, 0.3)',
      iconBg: 'rgba(255, 255, 255, 0.25)'
    },
    info: {
      bg: '#831238',
      gradient: 'linear-gradient(135deg, #831238 0%, #a52a5a 100%)',
      border: 'rgba(131, 18, 56, 0.3)',
      iconBg: 'rgba(255, 255, 255, 0.25)'
    },
  };

  const icons: Record<string, JSX.Element> = {
    success: <FiCheckCircle size={20} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />,
    error: <FiAlertCircle size={20} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />,
    info: <FiInfo size={20} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />,
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 10000,
  };

  const toastStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    padding: '18px 22px',
    borderRadius: '16px',
    color: 'white',
    background: colors[type].gradient,
    boxShadow: `
      0 6px 20px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1)
    `,
    border: `2px solid ${colors[type].border}`,
    minWidth: '320px',
    maxWidth: '420px',
    fontSize: '15px',
    fontWeight: 600,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
    transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  };

  const progressBarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '4px',
    width: `${progress}%`,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
    borderRadius: '0 2px 2px 0',
    transition: 'width 50ms ease-out',
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
  };

  const closeBtnStyle: React.CSSProperties = {
    cursor: 'pointer',
    opacity: 0.9,
    transition: 'all 0.3s ease',
    padding: '6px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const iconContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    background: colors[type].iconBg,
    flexShrink: 0,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.2)',
  };

  const textStyle: React.CSSProperties = {
    lineHeight: '1.5',
    flex: 1,
    textAlign: 'left' as 'left',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    fontWeight: 500,
  };

  const glowEffectStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
    opacity: isHovered ? 0.3 : 0.1,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      <div 
        style={toastStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow effect */}
        <div style={glowEffectStyle}></div>
        
        {/* Icon */}
        <div style={iconContainerStyle}>
          {icons[type]}
        </div>
        
        {/* Text */}
        <span style={textStyle}>{text}</span>
        
        {/* Close button */}
        <FiX 
          style={closeBtnStyle}
          size={18} 
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onHide?.(), 300);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
        
        {/* Progress bar */}
        <div style={progressBarStyle}></div>
      </div>
    </div>
  );
};

export default Message;