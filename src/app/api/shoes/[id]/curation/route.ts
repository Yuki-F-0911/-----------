import { NextResponse } from 'next/server'
import { CuratedSourceStatus, CuratedSourceType } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import { isAdminEmail } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma/client'
import { curatedSourceSchema } from '@/lib/validations/curation'
import { reliabilityScore } from '@/lib/curation/service'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 30)
  const typeParam = searchParams.get('type')
  const type = typeParam && (typeParam.toUpperCase() as CuratedSourceType)

  if (type && !Object.values(CuratedSourceType).includes(type)) {
    return NextResponse.json({ error: '不正なtypeパラメータです' }, { status: 400 })
  }

  const sources = await prisma.curatedSource.findMany({
    where: {
      shoeId: params.id,
      status: CuratedSourceStatus.PUBLISHED,
      ...(type ? { type } : {}),
    },
    orderBy: [
      { reliability: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  })

  return NextResponse.json({ success: true, data: sources })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()

  if (!session || !isAdminEmail(session.user?.email)) {
    return NextResponse.json({ error: '管理者のみが操作できます' }, { status: 403 })
  }

  const shoe = await prisma.shoe.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      locale: true,
      region: true,
    },
  })

  if (!shoe) {
    return NextResponse.json({ error: 'シューズが存在しません' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const payload = curatedSourceSchema.parse(body)
    const record = await prisma.curatedSource.create({
      data: {
        shoeId: shoe.id,
        ...payload,
        language: shoe.locale?.split('-')[0] || 'ja',
        country: shoe.region,
        curatedById: session.user.id,
        reliability: reliabilityScore(payload.type),
        tags: payload.tags || [],
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Failed to create curated source', error)
    return NextResponse.json({ error: 'キュレーションの登録に失敗しました' }, { status: 400 })
  }
}


