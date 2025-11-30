import { Metadata } from 'next'
import { generateAboutPageSchema, generateBreadcrumbSchema, combineSchemas } from '@/lib/seo/structured-data'

export const metadata: Metadata = {
    title: '私たちについて - シューズレビューサイトの運営方針',
    description: 'シューズレビューサイトの運営方針、ミッション、レビューの収集方法について。公平で信頼できるランニングシューズ情報を提供することを目指しています。',
    openGraph: {
        title: '私たちについて | シューズレビューサイト',
        description: '公平で信頼できるランニングシューズ情報を提供することを目指しています。',
    },
}

export default function AboutPage() {
    const aboutSchema = generateAboutPageSchema()
    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'ホーム', url: '/' },
        { name: '私たちについて', url: '/about' },
    ])

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(combineSchemas(aboutSchema, breadcrumbSchema)),
                }}
            />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* ヘッダー画像エリア */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12 text-center text-white">
                            <h1 className="text-3xl font-bold mb-4">私たちについて</h1>
                            <p className="opacity-90">
                                ランナーのための、公平で信頼できる情報源を目指して
                            </p>
                        </div>

                        <div className="p-8 space-y-12">
                            {/* ミッション */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-indigo-600 rounded-full"></span>
                                    ミッション
                                </h2>
                                <p className="text-slate-600 leading-relaxed">
                                    私たちのミッションは、すべてのランナーが自分に最適な一足と出会えるようサポートすることです。
                                    膨大な数のランニングシューズの中から、自分の足型、走り方、目標に合ったシューズを見つけるのは容易ではありません。
                                    私たちは、実際のユーザーの声とAI技術を組み合わせることで、客観的で網羅的なレビュー情報を提供します。
                                </p>
                            </section>

                            {/* レビューの収集方法 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-indigo-600 rounded-full"></span>
                                    情報の透明性と信頼性
                                </h2>
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-xl">
                                        <h3 className="font-bold text-slate-800 mb-2">ユーザーレビュー</h3>
                                        <p className="text-slate-600 text-sm">
                                            実際にシューズを購入し使用したランナーからの生の声を掲載しています。
                                            良い点だけでなく、気になった点も含めて率直な評価を共有いただくことで、
                                            リアルな使用感をお伝えします。
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-xl">
                                        <h3 className="font-bold text-slate-800 mb-2">AI統合レビュー</h3>
                                        <p className="text-slate-600 text-sm">
                                            Web上の信頼できるレビュー記事や動画レビューをAIが分析・要約しています。
                                            複数の情報源を横断的に分析することで、個人の主観に偏らない客観的な評価傾向を導き出します。
                                            すべてのAIレビューには引用元を明記し、情報の出所を明確にしています。
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* 運営体制 */}
                            <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-8 bg-indigo-600 rounded-full"></span>
                                    運営体制
                                </h2>
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    当サイトは、ランニングを愛するエンジニアとデータサイエンティストによって運営されています。
                                    常に最新のシューズ情報をキャッチアップし、システムの改善を続けています。
                                </p>
                                <div className="border-t border-slate-100 pt-4 mt-4">
                                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                        <div className="sm:col-span-1 font-bold text-slate-700">サイト名</div>
                                        <div className="sm:col-span-2 text-slate-600">シューズレビューサイト</div>

                                        <div className="sm:col-span-1 font-bold text-slate-700">設立</div>
                                        <div className="sm:col-span-2 text-slate-600">2024年</div>

                                        <div className="sm:col-span-1 font-bold text-slate-700">お問い合わせ</div>
                                        <div className="sm:col-span-2 text-slate-600">contact@shoe-review.jp</div>
                                    </dl>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
