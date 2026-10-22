import React from 'react';

const Card = ({ className = '', children }) => {
    return (
        <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm transition-all duration-200 ${className}`}>
            {children}
        </div>
    );
};

export default Card;