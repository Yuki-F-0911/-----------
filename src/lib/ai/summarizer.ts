/**
 * AI要約機能
 * 複数のレビューソースを統合して1つの要約レビューを生成
 */

export interface ReviewSource {
  type: 'WEB_ARTICLE' | 'YOUTUBE_VIDEO' | 'MANUAL'
  title: string
  content: string | any // Prismaから返される型に合わせてany型も許可
  author?: string
  url: string
  summary?: string | null // nullも許可
}

export interface SummarizedReview {
  title: string
  overallRating: number
  pros: string[]
  cons: string[]
  recommendedFor?: string
  summary: string
}

/**
 * 複数のレビューソースを統合して要約レビューを生成
 * @param sources レビューソースの配列
 * @param shoeBrand シューズのブランド名
 * @param shoeModel シューズのモデル名
 * @returns 要約レビュー
 */
export async function generateSummarizedReview(
  sources: ReviewSource[],
  shoeBrand: string,
  shoeModel: string
): Promise<SummarizedReview> {
  try {
    // 環境変数からAPIキーを取得
    const openaiApiKey = process.env.OPENAI_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!openaiApiKey && !geminiApiKey) {
      throw new Error('OPENAI_API_KEYまたはGEMINI_API_KEYが設定されていません')
    }

    // プロンプトを構築
    const sourcesText = sources
      .map((source, index) => {
        const content = source.summary || source.content
        return `【情報源${index + 1}】${source.type === 'YOUTUBE_VIDEO' ? 'YouTube動画' : 'Web記事'}
タイトル: ${source.title}
${source.author ? `著者: ${source.author}\n` : ''}内容: ${content.substring(0, 2000)}...`
      })
      .join('\n\n')

    const prompt = `あなたはシューズレビューを要約する専門家です。以下の複数の情報源から「${shoeBrand} ${shoeModel}」というシューズのレビューを統合し、構造化された要約を作成してください。

${sourcesText}

以下のフォーマットでJSON形式で出力してください：
{
  "title": "レビューのタイトル（40-60文字、必ず「${shoeBrand} ${shoeModel}」を含める。引き付けられる表現を使用。例：「${shoeBrand} ${shoeModel}を3ヶ月履いてみた本音レビュー」「はじめて履いた${shoeBrand} ${shoeModel}の感想」「${shoeBrand} ${shoeModel}を100km走って分かったこと」など）",
  "overall_rating": 0.0-10.0の数値（総合評価、小数点第1位まで）,
  "pros": ["良い点1", "良い点2", "良い点3"],
  "cons": ["悪い点1", "悪い点2"],
  "recommended_for": "推奨ランナータイプ（例: 初心者向け、マラソンランナー向け、スピード重視のランナー向けなど）",
  "summary": "レビューの要約文（200-300文字）"
}`

    // OpenAI APIを使用（優先）
    if (openaiApiKey) {
      return await generateWithOpenAI(prompt, openaiApiKey)
    }

    // Gemini APIを使用（フォールバック）
    if (geminiApiKey) {
      return await generateWithGemini(prompt, geminiApiKey)
    }

    throw new Error('AI APIキーが設定されていません')
  } catch (error) {
    console.error('Summarization error:', error)
    throw new Error(`要約生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * OpenAI APIを使用して要約を生成
 */
async function generateWithOpenAI(prompt: string, apiKey: string): Promise<SummarizedReview> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはシューズレビューを要約する専門家です。JSON形式で正確に出力してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI APIからの応答が空です')
  }

  // JSONをパース
  const result = JSON.parse(content)
  return {
    title: result.title || 'レビュー要約',
    overallRating: result.overall_rating || 3,
    pros: result.pros || [],
    cons: result.cons || [],
    recommendedFor: result.recommended_for,
    summary: result.summary || '',
  }
}

/**
 * Gemini APIを使用して要約を生成
 */
async function generateWithGemini(prompt: string, apiKey: string): Promise<SummarizedReview> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error('Gemini APIからの応答が空です')
  }

  // JSONを抽出してパース
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : content;
    const result = JSON.parse(jsonText);

    return {
      title: result.title || 'レビュー要約',
      overallRating: result.overall_rating || 3,
      pros: result.pros || [],
      cons: result.cons || [],
      recommendedFor: result.recommended_for,
      summary: result.summary || '',
    }
  } catch (error) {
    console.error('Failed to parse JSON from Gemini:', content);
    throw new Error('Geminiからの応答が有効なJSONではありません');
  }
}

