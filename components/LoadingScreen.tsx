import React from 'react';

/**
 * Экран загрузки — премиальный логотип SellBit.
 * Фазы: отрисовка линий «S» → сведение частей → бегущие импульсы → появление текста → буква S плавно в неон.
 * По окончании перехода S в неон вызывается onAnimationComplete (сразу после этого можно показывать приложение).
 */
interface LoadingScreenProps {
  onAnimationComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onAnimationComplete }) => (
  <div className="h-screen w-full bg-[#07090C] flex items-center justify-center overflow-hidden">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 600"
      className="w-full h-full max-h-[100vh] object-contain"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <filter id="loadingSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="loadingPulseGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style>
        {`
          .loading-draw-line {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            animation: loadingDrawIn 2.5s cubic-bezier(0.2, 0.8, 0.1, 1) forwards;
          }
          .loading-settle-top {
            transform: translate(-10px, -10px);
            animation: loadingSettleTop 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .loading-settle-bottom {
            transform: translate(10px, 10px);
            animation: loadingSettleBottom 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .loading-pulse-packet {
            stroke-dasharray: 30 500;
            stroke-dashoffset: 500;
            opacity: 0;
            animation:
              loadingFadeInPulse 0.5s ease 2.5s forwards,
              loadingRunPacket 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            animation-delay: 2.5s;
          }
          .loading-pulse-packet-bottom {
            stroke-dasharray: 30 500;
            stroke-dashoffset: 500;
            opacity: 0;
            animation:
              loadingFadeInPulse 0.5s ease 4s forwards,
              loadingRunPacket 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            animation-delay: 4s;
          }
          .loading-text-main {
            opacity: 0;
            transform: translateY(15px);
            animation: loadingTextReveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) 1.5s forwards;
          }
          .loading-text-sub {
            opacity: 0;
            transform: translateY(10px);
            animation: loadingSubTextReveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) 1.8s forwards;
          }
          .loading-s-neon {
            fill: #FFFFFF;
            animation: loadingSNeon 0.8s cubic-bezier(0.4, 0, 0.2, 1) 3s forwards;
          }
          @keyframes loadingSNeon {
            0% { fill: #FFFFFF; }
            100% { fill: #A3E635; }
          }
          @keyframes loadingDrawIn {
            0% { stroke-dashoffset: 400; opacity: 0; }
            10% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes loadingSettleTop {
            100% { transform: translate(0, 0); }
          }
          @keyframes loadingSettleBottom {
            100% { transform: translate(0, 0); }
          }
          @keyframes loadingRunPacket {
            0% { stroke-dashoffset: 500; }
            100% { stroke-dashoffset: -100; }
          }
          @keyframes loadingFadeInPulse {
            to { opacity: 1; }
          }
          @keyframes loadingTextReveal {
            0% { opacity: 0; transform: translateY(20px); letter-spacing: -1px; filter: blur(4px); }
            100% { opacity: 1; transform: translateY(0); letter-spacing: 1px; filter: blur(0); }
          }
          @keyframes loadingSubTextReveal {
            0% { opacity: 0; transform: translateY(10px); letter-spacing: 2px; }
            100% { opacity: 1; transform: translateY(0); letter-spacing: 6px; }
          }
        `}
      </style>

      <g transform="translate(10, -20)">
        <g
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path
            className="loading-settle-top"
            d="M 470,190 L 370,190 L 340,260 L 390,260"
            stroke="#1F2937"
          />
          <path
            className="loading-settle-top loading-draw-line"
            d="M 470,190 L 370,190 L 340,260 L 390,260"
            stroke="#A3E635"
            opacity="0.8"
            filter="url(#loadingSoftGlow)"
          />
          <path
            className="loading-settle-bottom"
            d="M 390,260 L 440,260 L 410,330 L 310,330"
            stroke="#1F2937"
          />
          <path
            className="loading-settle-bottom loading-draw-line"
            d="M 390,260 L 440,260 L 410,330 L 310,330"
            stroke="#A3E635"
            opacity="0.8"
            filter="url(#loadingSoftGlow)"
          />
        </g>

        <g
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#loadingPulseGlow)"
        >
          <path
            className="loading-pulse-packet"
            d="M 470,190 L 370,190 L 340,260 L 390,260"
            stroke="#FFFFFF"
          />
          <path
            className="loading-pulse-packet-bottom"
            d="M 310,330 L 410,330 L 440,260 L 390,260"
            stroke="#FFFFFF"
          />
        </g>
      </g>

      <g
        textAnchor="middle"
        style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif" }}
      >
        <text className="loading-text-main" x="400" y="420" fontSize="56">
          <tspan
            className="loading-s-neon"
            fontWeight="400"
            onAnimationEnd={onAnimationComplete}
          >
            S
          </tspan>
          <tspan fill="#FFFFFF" fontWeight="400">ell</tspan>
          <tspan fill="#A3E635" fontWeight="700">Bit</tspan>
        </text>
        <text
          className="loading-text-sub"
          x="400"
          y="460"
          fontSize="12"
          fill="#6B7280"
          fontWeight="500"
          letterSpacing="6"
        >
          SECURE EXCHANGE
        </text>
      </g>
    </svg>
  </div>
);

export default LoadingScreen;
