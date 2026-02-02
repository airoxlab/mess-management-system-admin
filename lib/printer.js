// Thermal printer utilities for token receipts

// Default receipt width (80mm thermal printer = ~48 characters)
const RECEIPT_WIDTH = 48;

// Center text
function centerText(text, width = RECEIPT_WIDTH) {
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text;
}

// Left-right aligned text
function leftRight(left, right, width = RECEIPT_WIDTH) {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

// Create separator line
function separator(char = '-', width = RECEIPT_WIDTH) {
  return char.repeat(width);
}

// Format receipt for thermal printer
export function formatTokenReceipt(data) {
  const {
    orgName = 'LIMHS CAFETERIA',
    tokenNo,
    memberName,
    memberId,
    mealType,
    date,
    time,
    balanceAfter,
  } = data;

  const lines = [
    '',
    centerText(orgName),
    centerText('MEAL TOKEN'),
    separator('='),
    '',
    centerText(`TOKEN # ${String(tokenNo).padStart(3, '0')}`),
    '',
    separator('-'),
    leftRight('Name:', memberName),
    leftRight('ID:', memberId),
    separator('-'),
    leftRight('Meal:', mealType),
    leftRight('Date:', date),
    leftRight('Time:', time),
    separator('-'),
    leftRight('Balance:', `${balanceAfter} meals`),
    separator('='),
    '',
    centerText('Present this token at'),
    centerText('the collection counter'),
    '',
    centerText('Thank you!'),
    '',
    separator('-'),
    centerText(new Date().toLocaleString()),
    '',
    '',
  ];

  return lines.join('\n');
}

// Format member card for printing
export function formatMemberCardData(member, org) {
  return {
    orgName: org?.name || 'LIMHS CAFETERIA',
    orgLogo: org?.logo_url,
    memberName: member.name,
    memberId: member.member_id,
    contact: member.contact,
    validUntil: member.valid_until,
    photoUrl: member.photo_url,
    supportPhone: org?.support_phone,
    supportWhatsapp: org?.support_whatsapp,
    lostCardFee: org?.lost_card_fee || 500,
  };
}

// Open print dialog for element
export function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          body { margin: 0; padding: 20px; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

// ESC/POS commands for thermal printers (if needed)
export const ESC_POS = {
  INIT: '\x1B\x40',
  CUT: '\x1D\x56\x00',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  CENTER: '\x1B\x61\x01',
  LEFT: '\x1B\x61\x00',
  RIGHT: '\x1B\x61\x02',
  DOUBLE_HEIGHT: '\x1B\x21\x10',
  NORMAL: '\x1B\x21\x00',
  LINE_FEED: '\x0A',
};
