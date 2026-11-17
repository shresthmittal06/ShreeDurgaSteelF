interface BrandMarkProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function BrandMark({ variant = 'light', className = 'w-8 h-8' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DFB362" />
          <stop offset="50%" stopColor="#C49339" />
          <stop offset="100%" stopColor="#966C23" />
        </linearGradient>
      </defs>
      {/* Outer Golden Hexagon/Shield */}
      <polygon
        points="20,2 37,11 37,29 20,38 3,29 3,11"
        fill="url(#goldGrad)"
        stroke="#1E1915"
        strokeWidth="1.2"
      />
      {/* Inner Black Diamond Badge */}
      <polygon
        points="20,6 33,13 33,27 20,34 7,27 7,13"
        fill="#1C1815"
      />
      {/* Steel Chevron Lines */}
      <path
        d="M13 18L20 13L27 18"
        stroke="#E4B869"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 22L20 18L26 22"
        stroke="#E4B869"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* SDS Monogram */}
      <text
        x="20"
        y="29"
        fill="#E4B869"
        fontSize="6.5"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
        letterSpacing="0.8"
      >
        SDS
      </text>
    </svg>
  );
}
