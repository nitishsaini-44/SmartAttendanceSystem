import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ size = 'default', text = 'Loading...' }) => {
    const sizeClasses = {
        small: 'h-4 w-4',
        default: 'h-8 w-8',
        large: 'h-12 w-12'
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
            <Loader2
                className={`${sizeClasses[size]} text-zinc-200 animate-spin`}
            />
            {text && (
                <p className="mt-3 text-zinc-400">{text}</p>
            )}
        </div>
    );
};

export default Loader;