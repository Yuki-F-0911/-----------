'use client'

import { useMemo, useState } from 'react'
import { CuratedSourceType } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ShoeOption {
  id: string
  label: string
}

interface CurationAdminPanelProps {
  shoes: ShoeOption[]
}

const curatedTypeOptions = Object.values(CuratedSourceType)

export function CurationAdminPanel({ shoes }: CurationAdminPanelProps) {
  const defaultShoeId = useMemo(() => shoes[0]?.id ?? '', [shoes])
  const [selectedShoe, setSelectedShoe] = useState(defaultShoeId)
  const [manualPayload, setManualPayload] = useState({
    title: '',
    url: '',
    type: CuratedSourceType.ARTICLE,
    excerpt: '',
  })
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [mediaMessage, setMediaMessage] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [isPrimaryMedia, setIsPrimaryMedia] = useState(false)
  const [altText, setAltText] = useState('')

  const handleRefresh = async () => {
    if (!selectedShoe) return
    setIsRefreshing(true)
    setRefreshMessage(null)
    try {
      const response = await fetch(`/api/admin/shoes/${selectedShoe}/curation/refresh`, {
        method: 'POST',
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || '収集に失敗しました')
      }
      setRefreshMessage(`自動収集が完了しました（${payload.data.created}件追加）`)
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : '自動収集に失敗しました')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!selectedShoe) return
    setIsSubmittingManual(true)
    setManualMessage(null)
    try {
      const response = await fetch(`/api/shoes/${selectedShoe}/curation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualPayload),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || '登録に失敗しました')
      }
      setManualMessage('キュレーションを登録しました')
      setManualPayload({
        title: '',
        url: '',
        type: manualPayload.type,
        excerpt: '',
      })
    } catch (error) {
      setManualMessage(error instanceof Error ? error.message : '登録に失敗しました')
    } finally {
      setIsSubmittingManual(false)
    }
  }

  const handleMediaUpload = async () => {
    if (!selectedShoe || !mediaFile) {
      setMediaMessage('PNGファイルを選択してください')
      return
    }
    setIsUploadingMedia(true)
    setMediaMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', mediaFile)
      formData.append('shoeId', selectedShoe)
      formData.append('isPrimary', String(isPrimaryMedia))
      if (altText) {
        formData.append('altText', altText)
      }

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'アップロードに失敗しました')
      }

      setMediaMessage('画像を登録しました（承認済み）')
      setMediaFile(null)
      setAltText('')
    } catch (error) {
      setMediaMessage(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setIsUploadingMedia(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>自動キュレーション収集</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">対象シューズ</label>
            <select
              value={selectedShoe}
              onChange={(event) => setSelectedShoe(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {shoes.map((shoe) => (
                <option key={shoe.id} value={shoe.id}>
                  {shoe.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={handleRefresh} disabled={!selectedShoe || isRefreshing}>
            {isRefreshing ? '収集中...' : 'AIで最新情報を収集'}
          </Button>
          {refreshMessage && <p className="text-sm text-gray-600">{refreshMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SNS / 公式リンクを手動登録</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">タイトル</label>
            <input
              type="text"
              value={manualPayload.title}
              onChange={(event) => setManualPayload((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">URL</label>
            <input
              type="url"
              value={manualPayload.url}
              onChange={(event) => setManualPayload((prev) => ({ ...prev, url: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">種別</label>
            <select
              value={manualPayload.type}
              onChange={(event) =>
                setManualPayload((prev) => ({
                  ...prev,
                  type: event.target.value as CuratedSourceType,
                }))
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {curatedTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">概要</label>
            <textarea
              value={manualPayload.excerpt}
              onChange={(event) => setManualPayload((prev) => ({ ...prev, excerpt: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Button type="button" onClick={handleManualSubmit} disabled={isSubmittingManual}>
            {isSubmittingManual ? '登録中...' : '情報源を追加'}
          </Button>
          {manualMessage && <p className="text-sm text-gray-600">{manualMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>公式画像を登録 (PNG)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <input
              type="file"
              accept="image/png"
              onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="mr-2 text-sm font-medium text-gray-700">メイン画像に設定</label>
            <input
              type="checkbox"
              checked={isPrimaryMedia}
              onChange={(event) => setIsPrimaryMedia(event.target.checked)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">代替テキスト</label>
            <input
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <Button type="button" onClick={handleMediaUpload} disabled={isUploadingMedia}>
            {isUploadingMedia ? 'アップロード中...' : '画像を登録'}
          </Button>
          {mediaMessage && <p className="text-sm text-gray-600">{mediaMessage}</p>}
        </CardContent>
      </Card>
    </div>
  )
}


