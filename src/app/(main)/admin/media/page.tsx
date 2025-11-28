'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface ShoeMedia {
  id: string
  shoeId: string
  publicUrl: string
  altText: string | null
  sourceType: string
  status: string
  isPrimary: boolean
  createdAt: string
  shoe: {
    id: string
    brand: string
    modelName: string
  }
  uploadedBy: {
    id: string
    displayName: string
    email: string
  } | null
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<ShoeMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchMedia()
  }, [statusFilter, page])

  const fetchMedia = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: '20',
      })
      const res = await fetch(`/api/admin/media?${params}`)
      const data = await res.json()
      setMedia(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (mediaId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, action }),
      })
      if (res.ok) {
        fetchMedia()
      }
    } catch (error) {
      console.error('Failed to update media:', error)
    }
  }

  const handleSetPrimary = async (mediaId: string) => {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, isPrimary: true }),
      })
      if (res.ok) {
        fetchMedia()
      }
    } catch (error) {
      console.error('Failed to set primary:', error)
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm('本当に削除しますか？')) return

    try {
      const res = await fetch(`/api/admin/media?id=${mediaId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchMedia()
      }
    } catch (error) {
      console.error('Failed to delete media:', error)
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            画像管理
          </h1>
          <p className="text-slate-600">
            シューズ画像の承認・管理を行います
          </p>
        </div>

        {/* フィルター */}
        <div className="flex gap-2 mb-6">
          {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {status === 'PENDING' && '承認待ち'}
              {status === 'APPROVED' && '承認済み'}
              {status === 'REJECTED' && '却下'}
            </button>
          ))}
        </div>

        {/* メディアグリッド */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-slate-500">該当する画像がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {media.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 画像 */}
                <div className="relative aspect-square bg-slate-100">
                  <Image
                    src={item.publicUrl}
                    alt={item.altText || `${item.shoe.brand} ${item.shoe.modelName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  {item.isPrimary && (
                    <span className="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                      メイン
                    </span>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full border ${
                      statusColors[item.status]
                    }`}
                  >
                    {item.status === 'PENDING' && '承認待ち'}
                    {item.status === 'APPROVED' && '承認済み'}
                    {item.status === 'REJECTED' && '却下'}
                  </span>
                </div>

                {/* 情報 */}
                <div className="p-4">
                  <Link
                    href={`/shoes/${item.shoe.id}`}
                    className="font-medium text-slate-800 hover:text-indigo-600 block mb-1"
                  >
                    {item.shoe.brand} {item.shoe.modelName}
                  </Link>
                  <p className="text-sm text-slate-500 mb-2">
                    {item.sourceType === 'ADMIN' ? '管理者' : 'ユーザー'}
                    {item.uploadedBy && ` - ${item.uploadedBy.displayName}`}
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                  </p>

                  {/* アクションボタン */}
                  <div className="flex gap-2 flex-wrap">
                    {item.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(item.id, 'approve')}
                          className="flex-1 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleAction(item.id, 'reject')}
                          className="flex-1 bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          却下
                        </button>
                      </>
                    )}
                    {item.status === 'APPROVED' && !item.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(item.id)}
                        className="flex-1 bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        メインに設定
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-slate-200 text-slate-600 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

