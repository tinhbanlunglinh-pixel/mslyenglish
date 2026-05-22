import React from 'react';

export const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <img 
    src="https://i.postimg.cc/KjfCRQ6Y/e15cb4f9-b2de-4779-8838-aafe20bc074f.png" 
    alt="Ms Lý English Logo" 
    className={`${className} object-contain`} 
  />
);
