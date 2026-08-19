import React from 'react';

export const FenceIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 4v16" />
    <path d="M4 4l-2 2" />
    <path d="M4 4l2 2" />
    <path d="M12 4v16" />
    <path d="M12 4l-2 2" />
    <path d="M12 4l2 2" />
    <path d="M20 4v16" />
    <path d="M20 4l-2 2" />
    <path d="M20 4l2 2" />
    <path d="M2 9h20" />
    <path d="M2 15h20" />
  </svg>
);
