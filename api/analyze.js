export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mediaType, lang, mode } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  let prompt;

  if (mode === 'menu') {
    prompt = lang === 'en'
      ? `This is a restaurant menu image. Analyze all menu items visible and return ONLY JSON:
{"items":[{"name":"item name","calories":number,"carbs":number,"protein":number,"fat":number,"price":"price if visible or null"}]}
List all visible menu items. Numbers as integers.`
      : `이것은 식당 메뉴판 사진입니다. 보이는 메뉴 항목들을 모두 분석해서 JSON만 반환해줘:
{"items":[{"name":"메뉴이름","calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"price":"가격(보이면) 또는 null"}]}
보이는 모든 메뉴를 목록으로. 숫자는 정수.`;
  } else {
    prompt = lang === 'en'
      ? `Analyze this food image and return ONLY JSON:
{"name":"food name","calories":number,"carbs":number,"protein":number,"fat":number,"sodium":number,"fiber":number,"sugar":number,"detail":"2-3 sentences about nutrition and health tips","healthScore":number,"tags":["tag1","tag2"]}
healthScore: 1-10 (10=very healthy). tags: choose from [고단백,저칼로리,고탄수화물,고지방,균형잡힘,채식,한식,양식,중식,일식,간식,식사]. Numbers as integers.`
      : `이 음식 사진을 분석해서 JSON만 반환해줘:
{"name":"음식이름","calories":숫자,"carbs":숫자,"protein":숫자,"fat":숫자,"sodium":숫자,"fiber":숫자,"sugar":숫자,"detail":"영양 정보와 건강 조언 2~3문장","healthScore":숫자,"tags":["태그1","태그2"]}
healthScore: 1~10 (10=매우건강). tags: [고단백,저칼로리,고탄수화물,고지방,균형잡힘,채식,한식,양식,중식,일식,간식,식사] 중 해당하는 것. 숫자는 정수.`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' });
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
