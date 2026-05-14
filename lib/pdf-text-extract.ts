/**
 * pdf-parse ab v2: nur noch `PDFParse`-Klasse (kein Default-Export wie in v1).
 * Gemeinsame Nutzung für KI-Extraktion und Klartext-Pipeline.
 */
export async function extractPdfPlainText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return typeof result?.text === 'string' ? result.text : ''
  } finally {
    await parser.destroy().catch(() => {})
  }
}
