import React from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ProsConsListProps {
    pros: string[]
    cons: string[]
}

export function ProsConsList({ pros, cons }: ProsConsListProps) {
    if (pros.length === 0 && cons.length === 0) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pros */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    良い点 (Pros)
                </h3>
                <ul className="space-y-3">
                    {pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-900 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            <span>{pro}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Cons */}
            <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    気になる点 (Cons)
                </h3>
                <ul className="space-y-3">
                    {cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-2 text-red-900 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span>{con}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
