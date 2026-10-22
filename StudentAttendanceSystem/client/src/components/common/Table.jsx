import React from 'react';

const Table = ({ columns = [], children }) => {
    return (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-950/60">
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>{children}</tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;