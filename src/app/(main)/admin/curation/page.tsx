import { auth } from '@/lib/auth/auth'
import { isAdminEmail } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma/client'
import { CurationAdminPanel } from '@/components/curation/CurationAdminPanel'

export default async function AdminCurationPage() {
  const session = await auth()
  const isAdmin = session?.user?.email && isAdminEmail(session.user.email)

  if (!isAdmin) {
    console.log('Admin Access Denied:', {
      email: session?.user?.email,
      isAdmin,
      envAdminEmails: process.env.ADMIN_EMAILS
    })
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900">管理者専用ページ</h1>
        <p className="mt-4 text-gray-600">アクセス権限がありません。</p>
      </div>
    )
  }

  const shoes = await prisma.shoe.findMany({
    orderBy: [
      { brand: 'asc' },
      { modelName: 'asc' },
    ],
    select: {
      id: true,
      brand: true,
      modelName: true,
    },
  })

  const shoeOptions = shoes.map((shoe: { id: string; brand: string; modelName: string }) => ({
    id: shoe.id,
    label: `${shoe.brand} ${shoe.modelName}`,
  }))

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">キュレーション管理</h1>
        <p className="mt-2 text-gray-600">SNS/公式情報と画像を安全に取り込みます。</p>
      </div>
      <CurationAdminPanel shoes={shoeOptions} />
    </div>
  )
}


