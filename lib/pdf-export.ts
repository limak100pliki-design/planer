import { jsPDF } from 'jspdf'
import { formatWeight } from './nutrition'

export interface ShoppingPdfItem {
  key: string
  name: string
  grams: number
  usedIn: number
  checked?: boolean
}

export interface ExportPdfOptions {
  items: ShoppingPdfItem[]
  dateFrom: string
  dateTo: string
  mealCount: number
  includeChecked?: boolean
}

let cachedRegularBase64: string | null = null
let cachedBoldBase64: string | null = null

async function loadFontAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    // Process in chunks to prevent stack overflow on large buffers
    const chunkSize = 8192
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }
    return btoa(binary)
  } catch (err) {
    console.warn('Could not load custom font for PDF, using fallback', err)
    return null
  }
}

export async function generateShoppingListPdf({
  items,
  dateFrom,
  dateTo,
  mealCount,
  includeChecked = true,
}: ExportPdfOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Try to load UTF-8 fonts with Polish diacritics
  if (!cachedRegularBase64) {
    cachedRegularBase64 = await loadFontAsBase64('/fonts/NotoSans-Regular.ttf')
  }
  if (!cachedBoldBase64) {
    cachedBoldBase64 = await loadFontAsBase64('/fonts/NotoSans-Bold.ttf')
  }

  let fontName = 'helvetica'
  if (cachedRegularBase64) {
    doc.addFileToVFS('NotoSans-Regular.ttf', cachedRegularBase64)
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
    fontName = 'NotoSans'
  }
  if (cachedBoldBase64) {
    doc.addFileToVFS('NotoSans-Bold.ttf', cachedBoldBase64)
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold')
  }

  const itemsToPrint = includeChecked ? items : items.filter((i) => !i.checked)

  const pageWidth = 210
  const pageHeight = 297
  const marginLeft = 15
  const marginRight = 15
  const contentWidth = pageWidth - marginLeft - marginRight

  const primaryColor = [31, 95, 62] as const // #1f5f3e
  const textColor = [28, 25, 23] as const // #1c1917
  const mutedColor = [120, 113, 108] as const // #78716c
  const borderColor = [231, 229, 228] as const // #e7e5e4

  let cursorY = 15

  const drawHeader = () => {
    // Top brand bar
    doc.setFillColor(...primaryColor)
    doc.rect(marginLeft, cursorY, contentWidth, 2, 'F')
    cursorY += 8

    // Brand and subtitle
    doc.setFont(fontName, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...primaryColor)
    doc.text('TALERZ — PLANER DIETY I POSIŁKÓW', marginLeft, cursorY)
    cursorY += 7

    // Main Title
    doc.setFont(fontName, 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...textColor)
    doc.text('Lista Zakupów', marginLeft, cursorY)
    cursorY += 6

    // Metadata details
    doc.setFont(fontName, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...mutedColor)
    const periodText = `Okres: ${dateFrom} do ${dateTo}   |   Posiłki: ${mealCount}   |   Produktów: ${itemsToPrint.length}`
    doc.text(periodText, marginLeft, cursorY)
    cursorY += 6

    // Header divider
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.4)
    doc.line(marginLeft, cursorY, marginLeft + contentWidth, cursorY)
    cursorY += 6

    // Table Header
    doc.setFillColor(244, 243, 239) // light neutral
    doc.rect(marginLeft, cursorY, contentWidth, 7, 'F')

    doc.setFont(fontName, 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...textColor)

    doc.text('Kupione', marginLeft + 2, cursorY + 4.8)
    doc.text('Nazwa produktu', marginLeft + 22, cursorY + 4.8)
    doc.text('W posiłkach', marginLeft + 115, cursorY + 4.8)
    doc.text('Ilość (waga)', marginLeft + contentWidth - 2, cursorY + 4.8, { align: 'right' })

    cursorY += 9
  }

  drawHeader()

  const rowHeight = 7.5
  const maxY = pageHeight - 18

  itemsToPrint.forEach((item, index) => {
    if (cursorY + rowHeight > maxY) {
      doc.addPage()
      cursorY = 15
      drawHeader()
    }

    // Alternating row background
    if (index % 2 === 1) {
      doc.setFillColor(252, 252, 251)
      doc.rect(marginLeft, cursorY - 1, contentWidth, rowHeight, 'F')
    }

    // Checkbox square
    doc.setDrawColor(180, 175, 170)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(marginLeft + 4, cursorY + 0.5, 4, 4, 0.6, 0.6, 'FD')

    if (item.checked) {
      doc.setFont(fontName, 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...primaryColor)
      doc.text('✓', marginLeft + 4.8, cursorY + 3.8)
    }

    // Product name
    doc.setFont(fontName, item.checked ? 'normal' : 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...(item.checked ? mutedColor : textColor))
    doc.text(item.name, marginLeft + 22, cursorY + 3.5)

    // Meals count
    doc.setFont(fontName, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...mutedColor)
    const mealLabel = `w ${item.usedIn} ${item.usedIn === 1 ? 'daniu' : 'daniach'}`
    doc.text(mealLabel, marginLeft + 115, cursorY + 3.5)

    // Quantity / Grams
    doc.setFont(fontName, 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...(item.checked ? mutedColor : textColor))
    doc.text(formatWeight(item.grams), marginLeft + contentWidth - 2, cursorY + 3.5, { align: 'right' })

    // Divider line
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.2)
    doc.line(marginLeft, cursorY + rowHeight - 1.5, marginLeft + contentWidth, cursorY + rowHeight - 1.5)

    cursorY += rowHeight
  })

  // Footers with page numbers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, pageHeight - 12, marginLeft + contentWidth, pageHeight - 12)

    doc.setFont(fontName, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...mutedColor)
    doc.text('Wygenerowano z aplikacji Talerz — planer diety', marginLeft, pageHeight - 7)
    doc.text(`Strona ${i} z ${totalPages}`, marginLeft + contentWidth, pageHeight - 7, { align: 'right' })
  }

  // Trigger download in browser
  const filename = `lista-zakupow_${dateFrom}_do_${dateTo}.pdf`
  doc.save(filename)
}
