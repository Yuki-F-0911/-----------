'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ShoeMedia {
  id: string
  publicUrl: string
  altText: string | null
  sourceType: string
  status: string
  isPrimary: boolean
  createdAt: string
}

interface Shoe {
  id: string
  brand: string
  modelName: string
  imageUrls: string[]
}

export default function ShoeImagesPage() {
  const params = useParams()
  const shoeId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [shoe, setShoe] = useState<Shoe | null>(null)
  const [media, setMedia] = useState<ShoeMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // シューズ情報を取得
      const shoeRes = await fetch(`/api/shoes/${shoeId}`)
      const shoeData = await shoeRes.json()
      setShoe(shoeData.data)

      // メディア一覧を取得
      const mediaRes = await fetch(`/api/admin/media?shoeId=${shoeId}`)
      const mediaData = await mediaRes.json()
      setMedia(mediaData.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [shoeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadProgress('アップロード中...')

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress(`アップロード中... (${i + 1}/${files.length})`)

        // PNGに変換
        const pngBlob = await convertToPng(file)

        const formData = new FormData()
        formData.append('file', pngBlob, `${file.name.split('.')[0]}.png`)
        formData.append('shoeId', shoeId)
        formData.append('altText', `${shoe?.brand} ${shoe?.modelName}`)
        if (media.length === 0 && i === 0) {
          formData.append('isPrimary', 'true')
        }

        await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })
      }

      setUploadProgress('完了！')
      fetchData()
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadProgress('エラーが発生しました')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const convertToPng = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to convert to PNG'))
              }
            },
            'image/png',
            1
          )
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSetPrimary = async (mediaId: string) => {
    try {
      await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, isPrimary: true }),
      })
      fetchData()
    } catch (error) {
      console.error('Failed to set primary:', error)
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm('本当に削除しますか？')) return

    try {
      await fetch(`/api/admin/media?id=${mediaId}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleApprove = async (mediaId: string) => {
    try {
      await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, action: 'approve' }),
      })
      fetchData()
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!shoe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">シューズが見つかりません</p>
          <Link href="/admin/shoes" className="text-indigo-600 hover:underline">
            シューズ一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href="/admin/shoes"
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-4 inline-block"
          >
            ← シューズ一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {shoe.brand} {shoe.modelName}
          </h1>
          <p className="text-slate-600">画像の管理</p>
        </div>

        {/* アップロードエリア */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">画像をアップロード</h2>
          <p className="text-sm text-slate-500 mb-4">
            PNG, JPG, WEBP形式の画像をアップロードできます。自動的にPNG形式に変換されます。
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg
                className="w-12 h-12 text-slate-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {uploading ? (
                <span className="text-indigo-600 font-medium">{uploadProgress}</span>
              ) : (
                <>
                  <span className="text-indigo-600 font-medium">
                    クリックして画像を選択
                  </span>
                  <span className="text-sm text-slate-500 mt-1">
                    または画像をドラッグ＆ドロップ
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* 画像一覧 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            画像一覧 ({media.length}件)
          </h2>

          {media.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              画像がありません。上のエリアからアップロードしてください。
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="relative group bg-slate-50 rounded-xl overflow-hidden"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={item.publicUrl}
                      alt={item.altText || `${shoe.brand} ${shoe.modelName}`}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>

                  {/* バッジ */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.isPrimary && (
                      <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                        メイン
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${item.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {item.status === 'APPROVED' && '承認済み'}
                      {item.status === 'PENDING' && '承認待ち'}
                      {item.status === 'REJECTED' && '却下'}
                    </span>
                  </div>

                  {/* アクションボタン */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {item.status === 'PENDING' && (
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700"
                      >
                        承認
                      </button>
                    )}
                    {item.status === 'APPROVED' && !item.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(item.id)}
                        className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                      >
                        メインに
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

