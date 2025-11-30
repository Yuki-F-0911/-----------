'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

interface ShoeFiltersProps {
    brands: string[]
    categories: string[]
}

export function ShoeFilters({ brands, categories }: ShoeFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [isOpen, setIsOpen] = useState(false)
    const [selectedBrands, setSelectedBrands] = useState<string[]>(
        searchParams.get('brands')?.split(',') || []
    )
    const [selectedCategories, setSelectedCategories] = useState<string[]>(
        searchParams.get('categories')?.split(',') || []
    )
    const [sort, setSort] = useState(searchParams.get('sort') || 'newest')

    // Update URL when filters change
    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString())

        if (selectedBrands.length > 0) {
            params.set('brands', selectedBrands.join(','))
        } else {
            params.delete('brands')
        }

        if (selectedCategories.length > 0) {
            params.set('categories', selectedCategories.join(','))
        } else {
            params.delete('categories')
        }

        if (sort) {
            params.set('sort', sort)
        }

        router.push(`/shoes?${params.toString()}`)
        setIsOpen(false) // Close mobile drawer if open
    }

    const clearFilters = () => {
        setSelectedBrands([])
        setSelectedCategories([])
        setSort('newest')
        router.push('/shoes')
        setIsOpen(false)
    }

    const toggleBrand = (brand: string) => {
        setSelectedBrands(prev =>
            prev.includes(brand)
                ? prev.filter(b => b !== brand)
                : [...prev, brand]
        )
    }

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        )
    }

    const hasActiveFilters = selectedBrands.length > 0 || selectedCategories.length > 0

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        フィルター
                    </h3>
                    {hasActiveFilters && (
                        <span className="lg:hidden text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            {selectedBrands.length + selectedCategories.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                            クリア
                        </button>
                    )}
                    <button
                        className="lg:hidden text-gray-500 p-1"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className={`${isOpen ? 'block' : 'hidden'} lg:block space-y-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 lg:border-none mt-2 lg:mt-0`}>
                {/* Sort */}
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">並び替え</label>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="newest">新着順</option>
                        <option value="price_asc">価格が安い順</option>
                        <option value="price_desc">価格が高い順</option>
                        <option value="rating">評価が高い順</option>
                    </select>
                </div>

                {/* Brands */}
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">ブランド</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {brands.map(brand => (
                            <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedBrands.includes(brand)}
                                    onChange={() => toggleBrand(brand)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900">{brand}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">カテゴリ</label>
                    <div className="space-y-2">
                        {categories.map(category => (
                            <label key={category} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(category)}
                                    onChange={() => toggleCategory(category)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900">{category}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <Button
                    onClick={applyFilters}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    適用する
                </Button>
            </div>
        </div>
    )
}
